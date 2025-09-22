import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../constants/tokens';

export interface ArbitrageOpportunity {
  tokenIn: string;
  tokenOut: string;
  buyFeeTier: number;
  sellFeeTier: number;
  amount: string;
  expectedProfit: number;
  profitPercentage: number;
  buyPrice: string;
  sellPrice: string;
}

export interface ArbitrageConfig {
  minProfitThreshold: number; // Minimum profit percentage to execute
  maxPositionSize: string; // Maximum amount to trade
  checkInterval: number; // How often to check for opportunities (ms)
  maxSlippage: number; // Maximum slippage tolerance
  enabledTokens: string[]; // Which tokens to monitor
}

export class ArbitrageStrategy {
  private bot: CicadaBot;
  private config: ArbitrageConfig;
  private isRunning: boolean = false;
  private opportunities: ArbitrageOpportunity[] = [];

  constructor(bot: CicadaBot, config: ArbitrageConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * Start the arbitrage monitoring
   */
  async start(): Promise<void> {
    this.isRunning = true;
    Logger.info('🚀 Starting Arbitrage Strategy', {
      minProfitThreshold: this.config.minProfitThreshold,
      maxPositionSize: this.config.maxPositionSize,
      checkInterval: this.config.checkInterval
    });

    while (this.isRunning) {
      try {
        await this.scanForOpportunities();
        await this.executeBestOpportunity();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        Logger.error('❌ Arbitrage scan error:', error instanceof Error ? error.message : String(error));
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Stop the arbitrage monitoring
   */
  stop(): void {
    this.isRunning = false;
    Logger.info('🛑 Arbitrage Strategy stopped');
  }

  /**
   * Scan for arbitrage opportunities across different fee tiers
   */
  private async scanForOpportunities(): Promise<void> {
    this.opportunities = [];

    // Test different amounts to find optimal arbitrage size
    const testAmounts = ['10', '25', '50', '100', '200'];
    
    for (const amount of testAmounts) {
      if (parseFloat(amount) > parseFloat(this.config.maxPositionSize)) {
        continue;
      }

      for (const tokenPair of this.getTokenPairs()) {
        const opportunity = await this.findArbitrageOpportunity(
          tokenPair.tokenIn,
          tokenPair.tokenOut,
          amount
        );

        if (opportunity && opportunity.profitPercentage >= this.config.minProfitThreshold) {
          this.opportunities.push(opportunity);
          
          // Add result to bot for web interface display
          this.bot.addArbitrageResult({
            type: 'Arbitrage Opportunity',
            amount: opportunity.amount,
            profitPercentage: opportunity.profitPercentage,
            expectedProfit: opportunity.expectedProfit.toFixed(6),
            tokenIn: tokenPair.tokenIn,
            tokenOut: tokenPair.tokenOut
          });
        }
      }
    }

    // Sort opportunities by profit percentage (highest first)
    this.opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);

    if (this.opportunities.length > 0) {
      Logger.info(`💰 Found ${this.opportunities.length} arbitrage opportunities`);
      this.opportunities.slice(0, 3).forEach((opp, index) => {
        Logger.info(`📊 Opportunity ${index + 1}:`, {
          pair: `${opp.tokenIn}/${opp.tokenOut}`,
          amount: opp.amount,
          profit: `${opp.profitPercentage.toFixed(4)}%`,
          expectedProfit: opp.expectedProfit.toFixed(6)
        });
      });
    }
  }

  /**
   * Find arbitrage opportunity for a specific token pair and amount
   */
  private async findArbitrageOpportunity(
    tokenIn: string,
    tokenOut: string,
    amount: string
  ): Promise<ArbitrageOpportunity | null> {
    try {
      const feeTiers = [
        { tier: FEE_TIERS.LOW, name: '0.05%' },
        { tier: FEE_TIERS.MEDIUM, name: '0.30%' },
        { tier: FEE_TIERS.HIGH, name: '1.00%' }
      ];

      const quotes: Array<{
        feeTier: number;
        name: string;
        amountOut: string;
        priceImpact: string;
      }> = [];

      // Get quotes from all available fee tiers
      for (const { tier, name } of feeTiers) {
        try {
          const quote = await this.bot.getQuote({
            tokenIn,
            tokenOut,
            amountIn: amount,
            slippageTolerance: this.config.maxSlippage,
            feeTier: tier
          });

          quotes.push({
            feeTier: tier,
            name,
            amountOut: quote.amountOut,
            priceImpact: quote.priceImpact
          });
        } catch (error) {
          // Fee tier not available or insufficient liquidity
          continue;
        }
      }

      if (quotes.length < 2) {
        return null; // Need at least 2 fee tiers for arbitrage
      }

      // Find the best buy and sell opportunities
      let bestOpportunity: ArbitrageOpportunity | null = null;

      for (let i = 0; i < quotes.length; i++) {
        for (let j = 0; j < quotes.length; j++) {
          if (i === j) continue;

          const buyQuote = quotes[i];
          const sellQuote = quotes[j];

          // Calculate if this is a profitable arbitrage
          const buyAmount = parseFloat(amount);
          const buyOutput = parseFloat(buyQuote.amountOut);
          const sellInput = buyOutput;
          
          // Get reverse quote (sell the output back to input)
          try {
            const reverseQuote = await this.bot.getQuote({
              tokenIn: tokenOut,
              tokenOut: tokenIn,
              amountIn: sellInput.toString(),
              slippageTolerance: this.config.maxSlippage,
              feeTier: sellQuote.feeTier
            });

            const sellOutput = parseFloat(reverseQuote.amountOut);
            const profit = sellOutput - buyAmount;
            const profitPercentage = (profit / buyAmount) * 100;

            if (profit > 0 && profitPercentage > (bestOpportunity?.profitPercentage || 0)) {
              bestOpportunity = {
                tokenIn,
                tokenOut,
                buyFeeTier: buyQuote.feeTier,
                sellFeeTier: sellQuote.feeTier,
                amount,
                expectedProfit: profit,
                profitPercentage,
                buyPrice: buyQuote.amountOut,
                sellPrice: reverseQuote.amountOut
              };
            }
          } catch (error) {
            // Reverse quote failed, skip this combination
            continue;
          }
        }
      }

      return bestOpportunity;

    } catch (error) {
      Logger.debug('Arbitrage scan failed for pair:', { tokenIn, tokenOut, amount });
      return null;
    }
  }

  /**
   * Execute the best arbitrage opportunity
   */
  private async executeBestOpportunity(): Promise<void> {
    if (this.opportunities.length === 0) {
      return;
    }

    const bestOpportunity = this.opportunities[0];
    
    Logger.info('🎯 Executing best arbitrage opportunity:', {
      pair: `${bestOpportunity.tokenIn}/${bestOpportunity.tokenOut}`,
      amount: bestOpportunity.amount,
      expectedProfit: `${bestOpportunity.profitPercentage.toFixed(4)}%`,
      buyFeeTier: bestOpportunity.buyFeeTier,
      sellFeeTier: bestOpportunity.sellFeeTier
    });

    try {
      // Step 1: Buy token (first leg of arbitrage)
      const buyResult = await this.bot.executeSwap({
        tokenIn: bestOpportunity.tokenIn,
        tokenOut: bestOpportunity.tokenOut,
        amountIn: bestOpportunity.amount,
        slippageTolerance: this.config.maxSlippage,
        feeTier: bestOpportunity.buyFeeTier
      });

      if (!buyResult.success) {
        Logger.error('❌ Arbitrage buy leg failed:', buyResult.error);
        return;
      }

      Logger.info('✅ Arbitrage buy leg successful:', {
        transactionHash: buyResult.transactionHash,
        amountOut: buyResult.amountOut
      });

      // Step 2: Sell token (second leg of arbitrage)
      const sellResult = await this.bot.executeSwap({
        tokenIn: bestOpportunity.tokenOut,
        tokenOut: bestOpportunity.tokenIn,
        amountIn: buyResult.amountOut,
        slippageTolerance: this.config.maxSlippage,
        feeTier: bestOpportunity.sellFeeTier
      });

      if (!sellResult.success) {
        Logger.error('❌ Arbitrage sell leg failed:', sellResult.error);
        return;
      }

      // Calculate actual profit
      const actualProfit = parseFloat(sellResult.amountOut) - parseFloat(bestOpportunity.amount);
      const actualProfitPercentage = (actualProfit / parseFloat(bestOpportunity.amount)) * 100;

      Logger.info('🎉 Arbitrage completed successfully!', {
        buyTransaction: buyResult.transactionHash,
        sellTransaction: sellResult.transactionHash,
        expectedProfit: bestOpportunity.expectedProfit.toFixed(6),
        actualProfit: actualProfit.toFixed(6),
        expectedPercentage: bestOpportunity.profitPercentage.toFixed(4) + '%',
        actualPercentage: actualProfitPercentage.toFixed(4) + '%'
      });

      // Add completed trade result to bot for web interface display
      this.bot.addArbitrageResult({
        type: 'Arbitrage Completed',
        amount: bestOpportunity.amount,
        profitPercentage: actualProfitPercentage,
        expectedProfit: actualProfit.toFixed(6),
        tokenIn: bestOpportunity.tokenIn,
        tokenOut: bestOpportunity.tokenOut
      });

      // Remove this opportunity from the list
      this.opportunities.shift();

    } catch (error) {
      Logger.error('❌ Arbitrage execution failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get token pairs to monitor for arbitrage
   */
  private getTokenPairs(): Array<{ tokenIn: string; tokenOut: string }> {
    const pairs = [];
    
    // GALA/USDC pair
    if (this.config.enabledTokens.includes('GALA') && this.config.enabledTokens.includes('USDC')) {
      pairs.push({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC
      });
    }

    // Add more pairs as needed
    // pairs.push({
    //   tokenIn: COMMON_TOKENS.GETH,
    //   tokenOut: COMMON_TOKENS.GUSDC
    // });

    return pairs;
  }

  /**
   * Get current opportunities (for monitoring)
   */
  public getCurrentOpportunities(): ArbitrageOpportunity[] {
    return [...this.opportunities];
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ArbitrageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.info('⚙️ Arbitrage configuration updated', this.config);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
