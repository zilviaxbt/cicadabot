import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../constants/tokens';

export interface SimpleArbitrageConfig {
  minProfitThreshold: number; // Minimum profit percentage
  maxPositionSize: string; // Maximum amount to trade
  checkInterval: number; // How often to check (ms)
  maxSlippage: number; // Maximum slippage tolerance
}

export interface SimpleArbitrageOpportunity {
  amount: string;
  expectedProfit: number;
  profitPercentage: number;
  buyFeeTier: number;
  sellFeeTier: number;
}

export class SimpleArbitrageStrategy {
  private bot: CicadaBot;
  private config: SimpleArbitrageConfig;
  private isRunning: boolean = false;

  constructor(bot: CicadaBot, config: SimpleArbitrageConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * Start simple arbitrage monitoring
   */
  async start(): Promise<void> {
    this.isRunning = true;
    Logger.info('🚀 Starting Simple Arbitrage Strategy', {
      minProfitThreshold: this.config.minProfitThreshold,
      maxPositionSize: this.config.maxPositionSize
    });

    while (this.isRunning) {
      try {
        await this.checkForOpportunities();
        
        // Check if still running before sleeping
        if (this.isRunning) {
          await this.sleep(this.config.checkInterval);
        }
      } catch (error) {
        Logger.error('❌ Arbitrage check error:', error instanceof Error ? error.message : String(error));
        
        // Check if still running before retry sleep
        if (this.isRunning) {
          await this.sleep(5000); // Wait 5 seconds before retrying
        }
      }
    }
  }

  /**
   * Stop arbitrage monitoring
   */
  stop(): void {
    this.isRunning = false;
    Logger.info('🛑 Simple Arbitrage Strategy stopped');
  }

  /**
   * Check for arbitrage opportunities
   */
  private async checkForOpportunities(): Promise<void> {
    // Check if we should stop before starting
    if (!this.isRunning) {
      return;
    }

    const testAmount = '10'; // Start with small amount
    
    if (parseFloat(testAmount) > parseFloat(this.config.maxPositionSize)) {
      return;
    }

    try {
      // Get quotes from available fee tiers
      const quotes = await this.getAvailableQuotes(testAmount);
      
      // Check if we should stop after getting quotes
      if (!this.isRunning) {
        return;
      }
      
      if (quotes.length < 2) {
        Logger.debug('Not enough fee tiers available for arbitrage');
        return;
      }

      // Find best arbitrage opportunity
      const opportunity = this.findBestOpportunity(quotes, testAmount);
      
      if (opportunity && opportunity.profitPercentage >= this.config.minProfitThreshold) {
        Logger.info('💰 Arbitrage opportunity found:', {
          amount: opportunity.amount,
          profit: `${opportunity.profitPercentage.toFixed(4)}%`,
          expectedProfit: opportunity.expectedProfit.toFixed(6)
        });

        // Add result to bot for web interface display
        this.bot.addArbitrageResult({
          type: 'Arbitrage Opportunity',
          amount: opportunity.amount,
          profitPercentage: opportunity.profitPercentage,
          expectedProfit: opportunity.expectedProfit.toFixed(6),
          tokenIn: 'GALA',
          tokenOut: 'USDC'
        });

        // Record the arbitrage opportunity as a transaction
        this.bot.addTransaction({
          type: 'arbitrage',
          tokenIn: 'GALA',
          tokenOut: 'USDC',
          amountIn: opportunity.amount,
          amountOut: '0', // Will be updated after execution
          feeTier: opportunity.buyFeeTier,
          status: 'pending',
          strategy: 'Simple Arbitrage',
          profit: opportunity.expectedProfit.toString()
        });

        // Check if we should stop before executing
        if (this.isRunning) {
          await this.executeArbitrage(opportunity);
        }
      } else {
        Logger.debug('No profitable arbitrage opportunities found');
      }

    } catch (error) {
      Logger.debug('Arbitrage check failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get quotes from all available fee tiers
   */
  private async getAvailableQuotes(amount: string): Promise<Array<{
    feeTier: number;
    name: string;
    amountOut: string;
    priceImpact: string;
  }>> {
    const feeTiers = [
      { tier: FEE_TIERS.LOW, name: '0.05%' },
      { tier: FEE_TIERS.MEDIUM, name: '0.30%' },
      { tier: FEE_TIERS.HIGH, name: '1.00%' }
    ];

    const quotes = [];

    for (const { tier, name } of feeTiers) {
      try {
        const quote = await this.bot.getQuote({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
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

        Logger.debug(`✅ ${name} fee tier quote: ${quote.amountOut} USDC`);

      } catch (error) {
        Logger.debug(`❌ ${name} fee tier not available:`, error instanceof Error ? error.message : String(error));
        // Continue with other fee tiers
      }
    }

    return quotes;
  }

  /**
   * Find the best arbitrage opportunity
   */
  private findBestOpportunity(quotes: Array<{
    feeTier: number;
    name: string;
    amountOut: string;
    priceImpact: string;
  }>, amount: string): SimpleArbitrageOpportunity | null {
    
    let bestOpportunity: SimpleArbitrageOpportunity | null = null;

    // Simple strategy: find the fee tier with the best output
    const bestQuote = quotes.reduce((best, current) => 
      parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
    );

    // For now, we'll use a simple approach
    // In a real arbitrage, you'd compare buy/sell prices across tiers
    const outputAmount = parseFloat(bestQuote.amountOut);
    const inputAmount = parseFloat(amount);
    
    // This is a simplified calculation - real arbitrage would involve
    // buying on one tier and selling on another
    const estimatedProfit = outputAmount * 0.001; // 0.1% estimated profit
    const profitPercentage = (estimatedProfit / inputAmount) * 100;

    if (profitPercentage >= this.config.minProfitThreshold) {
      bestOpportunity = {
        amount,
        expectedProfit: estimatedProfit,
        profitPercentage,
        buyFeeTier: bestQuote.feeTier,
        sellFeeTier: bestQuote.feeTier // Simplified - same tier for now
      };
    }

    return bestOpportunity;
  }

  /**
   * Execute arbitrage opportunity
   */
  private async executeArbitrage(opportunity: SimpleArbitrageOpportunity): Promise<void> {
    Logger.info('🎯 Executing arbitrage opportunity...');

    try {
      // For now, just execute a simple swap
      // Real arbitrage would involve buy/sell pairs
      const result = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC,
        amountIn: opportunity.amount,
        slippageTolerance: this.config.maxSlippage,
        feeTier: opportunity.buyFeeTier
      });

      if (result.success) {
        Logger.info('✅ Arbitrage execution successful:', {
          transactionHash: result.transactionHash,
          amountIn: result.amountIn,
          amountOut: result.amountOut
        });
      } else {
        Logger.error('❌ Arbitrage execution failed:', result.error);
      }

    } catch (error) {
      Logger.error('❌ Arbitrage execution error:', error instanceof Error ? error.message : String(error));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms);
      
      // Check if we should stop every 100ms for more responsive stopping
      const checkInterval = setInterval(() => {
        if (!this.isRunning) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Clean up interval when timeout completes
      setTimeout(() => clearInterval(checkInterval), ms);
    });
  }
}
