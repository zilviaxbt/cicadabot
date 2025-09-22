import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../constants/tokens';

export interface PriceDifferenceConfig {
  minPriceDifference: number; // Minimum price difference percentage
  maxPositionSize: string; // Maximum amount to trade
  checkInterval: number; // How often to check (ms)
  maxSlippage: number; // Maximum slippage tolerance
}

export class PriceDifferenceStrategy {
  private bot: CicadaBot;
  private config: PriceDifferenceConfig;
  private isRunning: boolean = false;
  private totalTrades: number = 0;
  private totalProfit: number = 0;

  constructor(bot: CicadaBot, config: PriceDifferenceConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * Start price difference monitoring
   */
  async start(): Promise<void> {
    this.isRunning = true;
    Logger.info('🚀 Starting Price Difference Strategy', {
      minPriceDifference: this.config.minPriceDifference,
      maxPositionSize: this.config.maxPositionSize
    });

    while (this.isRunning) {
      try {
        await this.checkForPriceDifferences();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        Logger.error('❌ Price difference check error:', error instanceof Error ? error.message : String(error));
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isRunning = false;
    Logger.info('🛑 Price Difference Strategy stopped');
    Logger.info('📊 Final Statistics:', {
      totalTrades: this.totalTrades,
      totalProfit: this.totalProfit.toFixed(6)
    });
  }

  /**
   * Check for price differences between fee tiers
   */
  private async checkForPriceDifferences(): Promise<void> {
    const testAmount = '1'; // 1 USDC
    
    if (parseFloat(testAmount) > parseFloat(this.config.maxPositionSize)) {
      return;
    }

    try {
      const workingFeeTiers = [
        { tier: FEE_TIERS.LOW, name: '0.05%' },
        { tier: FEE_TIERS.HIGH, name: '1.00%' }
      ];

      const quotes = [];

      // Get quotes from working fee tiers
      for (const { tier, name } of workingFeeTiers) {
        try {
          const quote = await this.bot.getQuote({
            tokenIn: COMMON_TOKENS.GUSDC,
            tokenOut: COMMON_TOKENS.GALA,
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

          Logger.debug(`✅ ${name} fee tier: ${quote.amountOut} GALA for 1 USDC`);

        } catch (error) {
          Logger.debug(`❌ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
        }
      }

      if (quotes.length < 2) {
        Logger.debug('Not enough working fee tiers for price difference analysis');
        return;
      }

      // Find the best price (most GALA for 1 USDC)
      const bestPrice = quotes.reduce((best, current) => 
        parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
      );

      const worstPrice = quotes.reduce((worst, current) => 
        parseFloat(current.amountOut) < parseFloat(worst.amountOut) ? current : worst
      );

      const priceDifference = parseFloat(bestPrice.amountOut) - parseFloat(worstPrice.amountOut);
      const priceDifferencePercentage = (priceDifference / parseFloat(worstPrice.amountOut)) * 100;

      Logger.info('📊 Price Difference Analysis:', {
        bestPrice: `${bestPrice.name}: ${bestPrice.amountOut} GALA for 1 USDC`,
        worstPrice: `${worstPrice.name}: ${worstPrice.amountOut} GALA for 1 USDC`,
        priceDifference: `${priceDifference.toFixed(6)} GALA`,
        priceDifferencePercentage: `${priceDifferencePercentage.toFixed(4)}%`,
        minThreshold: `${this.config.minPriceDifference}%`
      });

      // If price difference is significant, execute a simple trade
      if (priceDifferencePercentage >= this.config.minPriceDifference) {
        Logger.info('💰 Significant price difference found! Executing trade...');
        await this.executePriceDifferenceTrade(bestPrice, testAmount);
      } else {
        Logger.debug('Price difference below threshold');
      }

    } catch (error) {
      Logger.debug('Price difference check failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Execute a simple trade based on price difference
   */
  private async executePriceDifferenceTrade(bestPrice: {
    feeTier: number;
    name: string;
    amountOut: string;
    priceImpact: string;
  }, amount: string): Promise<void> {
    Logger.info('🎯 Executing price difference trade...');

    try {
      // Execute a simple USDC → GALA trade at the best price
      const result = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GUSDC,
        tokenOut: COMMON_TOKENS.GALA,
        amountIn: amount,
        slippageTolerance: this.config.maxSlippage,
        feeTier: bestPrice.feeTier
      });

      if (!result.success) {
        Logger.error('❌ Price difference trade failed:', result.error);
        return;
      }

      this.totalTrades++;
      // For now, we'll just track that we made a trade
      // In a real strategy, you'd want to track the actual profit

      Logger.info('🎉 Price difference trade completed!', {
        transactionHash: result.transactionHash,
        amountIn: amount,
        amountOut: result.amountOut,
        feeTier: bestPrice.name,
        totalTrades: this.totalTrades
      });

    } catch (error) {
      Logger.error('❌ Price difference trade execution error:', error instanceof Error ? error.message : String(error));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
