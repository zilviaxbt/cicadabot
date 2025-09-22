"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const ArbitrageStrategy_1 = require("../src/strategies/ArbitrageStrategy");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
/**
 * Automated Arbitrage Runner
 * Runs continuously and executes profitable arbitrage opportunities
 */
class AutoArbitrageRunner {
    constructor() {
        this.isRunning = false;
        this.totalTrades = 0;
        this.totalProfit = 0;
    }
    async initialize() {
        try {
            const config = (0, config_1.loadConfig)();
            (0, config_1.validateConfig)(config);
            logger_1.Logger.info('🤖 Initializing Auto Arbitrage Runner...');
            this.bot = new CicadaBot_1.CicadaBot(config);
            await this.bot.initialize();
            // Conservative arbitrage configuration
            const arbitrageConfig = {
                minProfitThreshold: 0.05, // 0.05% minimum profit (very conservative)
                maxPositionSize: '50', // Maximum 50 GALA per trade
                checkInterval: 15000, // Check every 15 seconds
                maxSlippage: 0.5, // 0.5% max slippage
                enabledTokens: ['GALA', 'USDC']
            };
            this.arbitrageStrategy = new ArbitrageStrategy_1.ArbitrageStrategy(this.bot, arbitrageConfig);
            logger_1.Logger.info('✅ Auto Arbitrage Runner initialized');
            logger_1.Logger.info(`💰 Wallet: ${config.walletAddress}`);
            logger_1.Logger.info(`📊 Configuration:`, arbitrageConfig);
        }
        catch (error) {
            logger_1.Logger.error('❌ Failed to initialize auto arbitrage runner', error);
            throw error;
        }
    }
    async start() {
        if (this.isRunning) {
            logger_1.Logger.warn('⚠️ Auto arbitrage is already running');
            return;
        }
        this.isRunning = true;
        logger_1.Logger.info('🚀 Starting Auto Arbitrage Runner...');
        logger_1.Logger.info('📊 Monitoring for arbitrage opportunities...');
        // Start the arbitrage strategy
        this.arbitrageStrategy.start().catch((error) => {
            logger_1.Logger.error('❌ Arbitrage strategy failed:', error);
            this.isRunning = false;
        });
        // Monitor and log statistics
        this.monitorStats();
    }
    stop() {
        if (!this.isRunning) {
            logger_1.Logger.warn('⚠️ Auto arbitrage is not running');
            return;
        }
        this.isRunning = false;
        this.arbitrageStrategy.stop();
        logger_1.Logger.info('🛑 Auto Arbitrage Runner stopped');
        logger_1.Logger.info('📊 Final Statistics:', {
            totalTrades: this.totalTrades,
            totalProfit: this.totalProfit.toFixed(6),
            averageProfit: this.totalTrades > 0 ? (this.totalProfit / this.totalTrades).toFixed(6) : '0'
        });
    }
    async monitorStats() {
        const statsInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(statsInterval);
                return;
            }
            const opportunities = this.arbitrageStrategy.getCurrentOpportunities();
            const status = this.bot.getStatus();
            logger_1.Logger.info('📊 Auto Arbitrage Status:', {
                running: this.isRunning,
                connected: status.connected,
                currentOpportunities: opportunities.length,
                totalTrades: this.totalTrades,
                totalProfit: this.totalProfit.toFixed(6),
                errorCount: status.errorCount
            });
            if (opportunities.length > 0) {
                const best = opportunities[0];
                logger_1.Logger.info('💰 Best Opportunity:', {
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
    }
    catch (error) {
        logger_1.Logger.error('❌ Auto arbitrage runner failed', error);
    }
    finally {
        await runner.cleanup();
    }
}
// Run with different strategies
async function runConservativeArbitrage() {
    logger_1.Logger.info('🐌 Starting Conservative Arbitrage Strategy');
    // This would use very conservative settings
    await runAutoArbitrage();
}
async function runAggressiveArbitrage() {
    logger_1.Logger.info('🚀 Starting Aggressive Arbitrage Strategy');
    // This would use more aggressive settings
    await runAutoArbitrage();
}
// Main execution
if (require.main === module) {
    const strategy = process.argv[2] || 'conservative';
    switch (strategy) {
        case 'aggressive':
            runAggressiveArbitrage().catch((error) => {
                logger_1.Logger.error('Unhandled error in aggressive arbitrage', error);
                process.exit(1);
            });
            break;
        case 'conservative':
        default:
            runConservativeArbitrage().catch((error) => {
                logger_1.Logger.error('Unhandled error in conservative arbitrage', error);
                process.exit(1);
            });
            break;
    }
}
//# sourceMappingURL=auto-arbitrage.js.map