import { CicadaBot } from '../src/CicadaBot';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../src/constants/tokens';

/**
 * Automated Trading Script
 * Executes predefined trading strategies
 */
class AutomatedTrader {
  private bot!: CicadaBot;
  private isRunning: boolean = false;

  constructor() {}

  async initialize() {
    try {
      const config = loadConfig();
      validateConfig(config);
      
      Logger.info('🤖 Initializing Automated Trader...');

      this.bot = new CicadaBot(config);
      await this.bot.initialize();
      
      Logger.info('✅ Automated Trader initialized');
      
    } catch (error) {
      Logger.error('❌ Failed to initialize automated trader', error);
      throw error;
    }
  }

  /**
   * Simple DCA (Dollar Cost Averaging) Strategy
   * Swaps a fixed amount of GALA to USDC at regular intervals
   */
  async dcaStrategy(amount: string, intervalMinutes: number, totalTrades: number) {
    Logger.info(`🔄 Starting DCA Strategy: ${amount} GALA every ${intervalMinutes} minutes for ${totalTrades} trades`);
    
    this.isRunning = true;
    let tradeCount = 0;

    while (this.isRunning && tradeCount < totalTrades) {
      try {
        tradeCount++;
        Logger.info(`\n📊 Trade ${tradeCount}/${totalTrades}`);
        
        // Get quote first
        const quote = await this.bot.getQuote({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: amount,
          slippageTolerance: 1.0,
          feeTier: FEE_TIERS.LOW
        });

        Logger.info(`💰 Quote: ${amount} GALA → ${quote.amountOut} USDC (${quote.priceImpact}% impact)`);

        // Execute swap
        const result = await this.bot.executeSwap({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: amount,
          slippageTolerance: 1.0,
          feeTier: FEE_TIERS.LOW
        });

        if (result.success) {
          Logger.info(`✅ Trade ${tradeCount} successful: ${result.transactionHash}`);
        } else {
          Logger.error(`❌ Trade ${tradeCount} failed: ${result.error}`);
        }

        // Wait for next trade (except for the last one)
        if (tradeCount < totalTrades && this.isRunning) {
          Logger.info(`⏰ Waiting ${intervalMinutes} minutes for next trade...`);
          await this.sleep(intervalMinutes * 60 * 1000);
        }

      } catch (error) {
        Logger.error(`❌ Trade ${tradeCount} error:`, error instanceof Error ? error.message : String(error));
        
        // Wait before retrying
        if (tradeCount < totalTrades) {
          await this.sleep(30000); // 30 seconds
        }
      }
    }

    Logger.info(`🏁 DCA Strategy completed. Executed ${tradeCount} trades.`);
  }

  /**
   * Price-based trading strategy
   * Swaps when price reaches certain thresholds
   */
  async priceBasedStrategy(amount: string, targetPrice: number, direction: 'above' | 'below') {
    Logger.info(`📈 Starting Price-based Strategy: Swap ${amount} GALA when price goes ${direction} ${targetPrice}`);
    
    this.isRunning = true;
    let checkCount = 0;

    while (this.isRunning) {
      try {
        checkCount++;
        const currentPrice = await this.bot.getCurrentPrice(COMMON_TOKENS.GALA, COMMON_TOKENS.GUSDC);
        const priceNum = parseFloat(currentPrice);
        
        Logger.info(`📊 Check ${checkCount}: Current price = ${priceNum.toFixed(6)} (target: ${targetPrice})`);

        const shouldTrade = direction === 'above' ? priceNum >= targetPrice : priceNum <= targetPrice;

        if (shouldTrade) {
          Logger.info(`🎯 Target price reached! Executing trade...`);
          
          const result = await this.bot.executeSwap({
            tokenIn: COMMON_TOKENS.GALA,
            tokenOut: COMMON_TOKENS.GUSDC,
            amountIn: amount,
            slippageTolerance: 1.0,
            feeTier: FEE_TIERS.LOW
          });

          if (result.success) {
            Logger.info(`✅ Price-based trade successful: ${result.transactionHash}`);
            break; // Exit after successful trade
          } else {
            Logger.error(`❌ Price-based trade failed: ${result.error}`);
          }
        }

        // Check every 30 seconds
        await this.sleep(30000);
        
      } catch (error) {
        Logger.error(`❌ Price check error:`, error instanceof Error ? error.message : String(error));
        await this.sleep(30000);
      }
    }
  }

  /**
   * Simple arbitrage strategy
   * Compares prices across different fee tiers
   */
  async arbitrageStrategy(amount: string) {
    Logger.info(`🔄 Starting Arbitrage Strategy: ${amount} GALA`);
    
    try {
      const feeTiers = [
        { tier: FEE_TIERS.LOW, name: '0.05%' },
        { tier: FEE_TIERS.MEDIUM, name: '0.30%' },
        { tier: FEE_TIERS.HIGH, name: '1.00%' }
      ];

      const quotes = [];

      // Get quotes from all available fee tiers
      for (const { tier, name } of feeTiers) {
        try {
          const quote = await this.bot.getQuote({
            tokenIn: COMMON_TOKENS.GALA,
            tokenOut: COMMON_TOKENS.GUSDC,
            amountIn: amount,
            slippageTolerance: 0.5,
            feeTier: tier
          });

          quotes.push({
            tier,
            name,
            amountOut: quote.amountOut,
            priceImpact: quote.priceImpact
          });

          Logger.info(`📊 ${name} fee tier: ${quote.amountOut} USDC (${quote.priceImpact}% impact)`);
          
        } catch (error) {
          Logger.warn(`⚠️ ${name} fee tier not available`);
        }
      }

      if (quotes.length === 0) {
        Logger.error('❌ No quotes available for arbitrage');
        return;
      }

      // Find the best quote
      const bestQuote = quotes.reduce((best, current) => 
        parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
      );

      Logger.info(`🏆 Best quote: ${bestQuote.name} fee tier → ${bestQuote.amountOut} USDC`);

      // Execute trade with best quote
      const result = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC,
        amountIn: amount,
        slippageTolerance: 0.5,
        feeTier: bestQuote.tier
      });

      if (result.success) {
        Logger.info(`✅ Arbitrage trade successful: ${result.transactionHash}`);
      } else {
        Logger.error(`❌ Arbitrage trade failed: ${result.error}`);
      }

    } catch (error) {
      Logger.error('❌ Arbitrage strategy failed:', error instanceof Error ? error.message : String(error));
    }
  }

  stop() {
    this.isRunning = false;
    Logger.info('🛑 Automated trading stopped');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    this.stop();
    await this.bot.disconnect();
  }
}

// Example usage
async function runAutomatedTrader() {
  const trader = new AutomatedTrader();
  
  try {
    await trader.initialize();

    // Example 1: DCA Strategy - Swap 10 GALA every 5 minutes for 3 trades
    // await trader.dcaStrategy('10', 5, 3);

    // Example 2: Price-based Strategy - Swap 50 GALA when price goes above 0.018
    // await trader.priceBasedStrategy('50', 0.018, 'above');

    // Example 3: Arbitrage Strategy - Find best price for 25 GALA
    await trader.arbitrageStrategy('25');

  } catch (error) {
    Logger.error('❌ Automated trader failed', error);
  } finally {
    await trader.cleanup();
  }
}

// Run the automated trader
if (require.main === module) {
  runAutomatedTrader().catch((error) => {
    Logger.error('Unhandled error in automated trader', error);
    process.exit(1);
  });
}
