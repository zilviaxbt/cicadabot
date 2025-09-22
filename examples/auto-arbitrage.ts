import { CicadaBot } from '../src/CicadaBot';
import { ArbitrageStrategy, ArbitrageConfig } from '../src/strategies/ArbitrageStrategy';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';

/**
 * Automated Arbitrage Runner
 * Runs continuously and executes profitable arbitrage opportunities
 */
class AutoArbitrageRunner {
  private bot: CicadaBot;
  private arbitrageStrategy: ArbitrageStrategy;
  private isRunning: boolean = false;
  private totalTrades: number = 0;
  private totalProfit: number = 0;

  constructor() {}

  async initialize() {
    try {
      const config = loadConfig();
      validateConfig(config);
      
      Logger.info('🤖 Initializing Auto Arbitrage Runner...');

      this.bot = new CicadaBot(config);
      await this.bot.initialize();
      
      // Conservative arbitrage configuration
      const arbitrageConfig: ArbitrageConfig = {
        minProfitThreshold: 0.05, // 0.05% minimum profit (very conservative)
        maxPositionSize: '50', // Maximum 50 GALA per trade
        checkInterval: 15000, // Check every 15 seconds
        maxSlippage: 0.5, // 0.5% max slippage
        enabledTokens: ['GALA', 'USDC']
      };

      this.arbitrageStrategy = new ArbitrageStrategy(this.bot, arbitrageConfig);
      
      Logger.info('✅ Auto Arbitrage Runner initialized');
      Logger.info(`💰 Wallet: ${config.walletAddress}`);
      Logger.info(`📊 Configuration:`, arbitrageConfig);
      
    } catch (error) {
      Logger.error('❌ Failed to initialize auto arbitrage runner', error);
      throw error;
    }
  }

  async start() {
    if (this.isRunning) {
      Logger.warn('⚠️ Auto arbitrage is already running');
      return;
    }

    this.isRunning = true;
    Logger.info('🚀 Starting Auto Arbitrage Runner...');
    Logger.info('📊 Monitoring for arbitrage opportunities...');

    // Start the arbitrage strategy
    this.arbitrageStrategy.start().catch((error) => {
      Logger.error('❌ Arbitrage strategy failed:', error);
      this.isRunning = false;
    });

    // Monitor and log statistics
    this.monitorStats();
  }

  stop() {
    if (!this.isRunning) {
      Logger.warn('⚠️ Auto arbitrage is not running');
      return;
    }

    this.isRunning = false;
    this.arbitrageStrategy.stop();
    
    Logger.info('🛑 Auto Arbitrage Runner stopped');
    Logger.info('📊 Final Statistics:', {
      totalTrades: this.totalTrades,
      totalProfit: this.totalProfit.toFixed(6),
      averageProfit: this.totalTrades > 0 ? (this.totalProfit / this.totalTrades).toFixed(6) : '0'
    });
  }

  private async monitorStats() {
    const statsInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(statsInterval);
        return;
      }

      const opportunities = this.arbitrageStrategy.getCurrentOpportunities();
      const status = this.bot.getStatus();

      Logger.info('📊 Auto Arbitrage Status:', {
        running: this.isRunning,
        connected: status.connected,
        currentOpportunities: opportunities.length,
        totalTrades: this.totalTrades,
        totalProfit: this.totalProfit.toFixed(6),
        errorCount: status.errorCount
      });

      if (opportunities.length > 0) {
        const best = opportunities[0];
        Logger.info('💰 Best Opportunity:', {
          profit: `${best.profitPercentage.toFixed(4)}%`,
          amount: best.amount,
          expectedProfit: best.expectedProfit.toFixed(6)
        });
      }
    }, 60000); // Log stats every minute
  }

  async cleanup() {
    this.stop();
    await this.bot.disconnect();
  }
}

// Example usage with different configurations
async function runAutoArbitrage() {
  const runner = new AutoArbitrageRunner();
  
  try {
    await runner.initialize();
    await runner.start();

    // Keep running until interrupted
    await new Promise((resolve) => {
      process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down auto arbitrage...');
        await runner.cleanup();
        resolve(void 0);
      });
    });

  } catch (error) {
    Logger.error('❌ Auto arbitrage runner failed', error);
  } finally {
    await runner.cleanup();
  }
}

// Run with different strategies
async function runConservativeArbitrage() {
  Logger.info('🐌 Starting Conservative Arbitrage Strategy');
  // This would use very conservative settings
  await runAutoArbitrage();
}

async function runAggressiveArbitrage() {
  Logger.info('🚀 Starting Aggressive Arbitrage Strategy');
  // This would use more aggressive settings
  await runAutoArbitrage();
}

// Main execution
if (require.main === module) {
  const strategy = process.argv[2] || 'conservative';
  
  switch (strategy) {
    case 'aggressive':
      runAggressiveArbitrage().catch((error) => {
        Logger.error('Unhandled error in aggressive arbitrage', error);
        process.exit(1);
      });
      break;
    case 'conservative':
    default:
      runConservativeArbitrage().catch((error) => {
        Logger.error('Unhandled error in conservative arbitrage', error);
        process.exit(1);
      });
      break;
  }
}
