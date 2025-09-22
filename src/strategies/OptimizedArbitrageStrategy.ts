import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../constants/tokens';

export interface OptimizedArbitrageConfig {
  minProfitThreshold: number; // Minimum profit percentage
  maxPositionSize: string; // Maximum amount to trade
  checkInterval: number; // How often to check (ms)
  maxSlippage: number; // Maximum slippage tolerance
}

export interface OptimizedArbitrageOpportunity {
  amount: string;
  expectedProfit: number;
  profitPercentage: number;
  buyFeeTier: number;
  sellFeeTier: number;
  buyPrice: string;
  sellPrice: string;
}

export class OptimizedArbitrageStrategy {
  private bot: CicadaBot;
  private config: OptimizedArbitrageConfig;
  private isRunning: boolean = false;
  private totalTrades: number = 0;
  private totalProfit: number = 0;

  constructor(bot: CicadaBot, config: OptimizedArbitrageConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * Start optimized arbitrage monitoring
   */
  async start(): Promise<void> {
    this.isRunning = true;
    Logger.info('🚀 Starting Optimized Arbitrage Strategy', {
      minProfitThreshold: this.config.minProfitThreshold,
      maxPositionSize: this.config.maxPositionSize
    });

    while (this.isRunning) {
      try {
        await this.checkForOpportunities();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        Logger.error('❌ Arbitrage check error:', error instanceof Error ? error.message : String(error));
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Stop arbitrage monitoring
   */
  stop(): void {
    this.isRunning = false;
    Logger.info('🛑 Optimized Arbitrage Strategy stopped');
    Logger.info('📊 Final Statistics:', {
      totalTrades: this.totalTrades,
      totalProfit: this.totalProfit.toFixed(6)
    });
  }

  /**
   * Check for arbitrage opportunities between working fee tiers
   */
  private async checkForOpportunities(): Promise<void> {
    const testAmount = '10'; // Start with small amount
    
    if (parseFloat(testAmount) > parseFloat(this.config.maxPositionSize)) {
      return;
    }

    try {
      // Only use the two working fee tiers
      const workingFeeTiers = [
        { tier: FEE_TIERS.LOW, name: '0.05%' },
        { tier: FEE_TIERS.HIGH, name: '1.00%' }
      ];

      const quotes = [];

      // Get quotes from working fee tiers only
      for (const { tier, name } of workingFeeTiers) {
        try {
          const quote = await this.bot.getQuote({
            tokenIn: COMMON_TOKENS.GALA,
            tokenOut: COMMON_TOKENS.GUSDC,
            amountIn: testAmount,
            slippageTolerance: this.config.maxSlippage,
            feeTier: tier
          });

          quotes.push({
            feeTier: tier,
            name,
            amountOut: quote.amountOut,
            priceImpact: quote.priceImpact
          });

          Logger.debug(`✅ ${name} fee tier: ${quote.amountOut} USDC`);

        } catch (error) {
          Logger.debug(`❌ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
        }
      }

      if (quotes.length < 2) {
        Logger.debug('Not enough working fee tiers for arbitrage');
        return;
      }

      // Find arbitrage opportunity between the two working tiers
      const opportunity = this.findArbitrageOpportunity(quotes, testAmount);
      
      if (opportunity && opportunity.profitPercentage >= this.config.minProfitThreshold) {
        Logger.info('💰 Arbitrage opportunity found:', {
          amount: opportunity.amount,
          profit: `${opportunity.profitPercentage.toFixed(4)}%`,
          expectedProfit: opportunity.expectedProfit.toFixed(6),
          buyTier: `${opportunity.buyFeeTier / 100}%`,
          sellTier: `${opportunity.sellFeeTier / 100}%`
        });

        // Add result to bot for web interface display
        this.bot.addArbitrageResult({
          type: 'Optimized Arbitrage',
          amount: opportunity.amount,
          profitPercentage: opportunity.profitPercentage,
          expectedProfit: opportunity.expectedProfit.toFixed(6),
          tokenIn: 'GALA',
          tokenOut: 'USDC'
        });

        await this.executeArbitrage(opportunity);
      } else {
        Logger.debug('No profitable arbitrage opportunities found');
      }

    } catch (error) {
      Logger.debug('Arbitrage check failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Find arbitrage opportunity between working fee tiers
   */
  private findArbitrageOpportunity(quotes: Array<{
    feeTier: number;
    name: string;
    amountOut: string;
    priceImpact: string;
  }>, amount: string): OptimizedArbitrageOpportunity | null {
    
    if (quotes.length < 2) {
      return null;
    }

    // Find the best buy and sell opportunities
    const bestBuy = quotes.reduce((best, current) => 
      parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
    );

    const bestSell = quotes.reduce((best, current) => 
      parseFloat(current.amountOut) < parseFloat(best.amountOut) ? current : best
    );

    // Calculate potential arbitrage profit
    const buyOutput = parseFloat(bestBuy.amountOut);
    const sellOutput = parseFloat(bestSell.amountOut);
    
    // For arbitrage, we want to buy where we get more USDC and sell where we get less USDC
    // But we need to account for the reverse transaction
    const potentialProfit = buyOutput - sellOutput;
    const profitPercentage = (potentialProfit / parseFloat(amount)) * 100;

    if (profitPercentage >= this.config.minProfitThreshold) {
      return {
        amount,
        expectedProfit: potentialProfit,
        profitPercentage,
        buyFeeTier: bestBuy.feeTier,
        sellFeeTier: bestSell.feeTier,
        buyPrice: bestBuy.amountOut,
        sellPrice: bestSell.amountOut
      };
    }

    return null;
  }

  /**
   * Execute arbitrage opportunity
   */
  private async executeArbitrage(opportunity: OptimizedArbitrageOpportunity): Promise<void> {
    Logger.info('🎯 Executing arbitrage opportunity...');

    try {
      // Step 1: Buy GALA with USDC (get more USDC for GALA)
      const buyResult = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC,
        amountIn: opportunity.amount,
        slippageTolerance: this.config.maxSlippage,
        feeTier: opportunity.buyFeeTier
      });

      if (!buyResult.success) {
        Logger.error('❌ Arbitrage buy leg failed:', buyResult.error);
        return;
      }

      Logger.info('✅ Arbitrage buy leg successful:', {
        transactionHash: buyResult.transactionHash,
        amountOut: buyResult.amountOut
      });

      // Step 2: Sell USDC for GALA (get less USDC for GALA)
      const sellResult = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GUSDC,
        tokenOut: COMMON_TOKENS.GALA,
        amountIn: buyResult.amountOut,
        slippageTolerance: this.config.maxSlippage,
        feeTier: opportunity.sellFeeTier
      });

      if (!sellResult.success) {
        Logger.error('❌ Arbitrage sell leg failed:', sellResult.error);
        return;
      }

      // Calculate actual profit
      const actualProfit = parseFloat(sellResult.amountOut) - parseFloat(opportunity.amount);
      this.totalTrades++;
      this.totalProfit += actualProfit;

      Logger.info('🎉 Arbitrage completed successfully!', {
        buyTransaction: buyResult.transactionHash,
        sellTransaction: sellResult.transactionHash,
        expectedProfit: opportunity.expectedProfit.toFixed(6),
        actualProfit: actualProfit.toFixed(6),
        totalTrades: this.totalTrades,
        totalProfit: this.totalProfit.toFixed(6)
      });

      // Add completed trade result to bot for web interface display
      this.bot.addArbitrageResult({
        type: 'Optimized Arbitrage Completed',
        amount: opportunity.amount,
        profitPercentage: (actualProfit / parseFloat(opportunity.amount)) * 100,
        expectedProfit: actualProfit.toFixed(6),
        tokenIn: 'GALA',
        tokenOut: 'USDC'
      });

    } catch (error) {
      Logger.error('❌ Arbitrage execution error:', error instanceof Error ? error.message : String(error));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
