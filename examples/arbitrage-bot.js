"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const ArbitrageStrategy_1 = require("../src/strategies/ArbitrageStrategy");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const readline = __importStar(require("readline"));
/**
 * Advanced Arbitrage Bot for Cicada Bot
 * Monitors multiple pools and executes profitable arbitrage opportunities
 */
class ArbitrageBot {
    constructor() {
        this.isRunning = false;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    async initialize() {
        try {
            // Load configuration
            const config = (0, config_1.loadConfig)();
            (0, config_1.validateConfig)(config);
            logger_1.Logger.info('🚀 Initializing Advanced Arbitrage Bot...');
            // Initialize bot
            this.bot = new CicadaBot_1.CicadaBot(config);
            await this.bot.initialize();
            // Initialize arbitrage strategy
            const arbitrageConfig = {
                minProfitThreshold: 0.1, // 0.1% minimum profit
                maxPositionSize: '100', // Maximum 100 GALA per trade
                checkInterval: 10000, // Check every 10 seconds
                maxSlippage: 1.0, // 1% max slippage
                enabledTokens: ['GALA', 'USDC'] // Monitor GALA/USDC pair
            };
            this.arbitrageStrategy = new ArbitrageStrategy_1.ArbitrageStrategy(this.bot, arbitrageConfig);
            logger_1.Logger.info('✅ Arbitrage Bot initialized successfully');
            logger_1.Logger.info(`💰 Wallet: ${config.walletAddress}`);
            logger_1.Logger.info(`📊 Monitoring: GALA/USDC arbitrage opportunities`);
        }
        catch (error) {
            logger_1.Logger.error('❌ Failed to initialize arbitrage bot', error);
            throw error;
        }
    }
    async showMenu() {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 GalaSwap Advanced Arbitrage Bot');
        console.log('='.repeat(60));
        console.log('1. 🚀 Start Arbitrage Monitoring');
        console.log('2. 🛑 Stop Arbitrage Monitoring');
        console.log('3. 📊 Show Current Opportunities');
        console.log('4. ⚙️  Update Configuration');
        console.log('5. 🔍 Manual Opportunity Scan');
        console.log('6. 📈 Show Bot Status');
        console.log('7. ❌ Exit');
        console.log('='.repeat(60));
    }
    async startArbitrage() {
        if (this.isRunning) {
            console.log('⚠️ Arbitrage monitoring is already running');
            return;
        }
        this.isRunning = true;
        console.log('🚀 Starting arbitrage monitoring...');
        // Start arbitrage strategy in background
        this.arbitrageStrategy.start().catch((error) => {
            logger_1.Logger.error('❌ Arbitrage strategy failed:', error);
            this.isRunning = false;
        });
        // Show status updates
        this.showStatusUpdates();
    }
    async stopArbitrage() {
        if (!this.isRunning) {
            console.log('⚠️ Arbitrage monitoring is not running');
            return;
        }
        this.arbitrageStrategy.stop();
        this.isRunning = false;
        console.log('🛑 Arbitrage monitoring stopped');
    }
    async showCurrentOpportunities() {
        const opportunities = this.arbitrageStrategy.getCurrentOpportunities();
        if (opportunities.length === 0) {
            console.log('📊 No current arbitrage opportunities found');
            return;
        }
        console.log(`\n📊 Current Arbitrage Opportunities (${opportunities.length}):`);
        console.log('Rank | Pair        | Amount | Profit % | Expected Profit');
        console.log('-'.repeat(60));
        opportunities.slice(0, 10).forEach((opp, index) => {
            const pair = `${opp.tokenIn.split('|')[0]}/${opp.tokenOut.split('|')[0]}`;
            console.log(`${(index + 1).toString().padStart(4)} | ${pair.padEnd(10)} | ${opp.amount.padStart(6)} | ${opp.profitPercentage.toFixed(4).padStart(8)}% | ${opp.expectedProfit.toFixed(6)}`);
        });
    }
    async updateConfiguration() {
        console.log('\n⚙️ Current Configuration:');
        console.log('1. Min Profit Threshold: 0.1%');
        console.log('2. Max Position Size: 100 GALA');
        console.log('3. Check Interval: 10 seconds');
        console.log('4. Max Slippage: 1.0%');
        const choice = await this.askQuestion('\nSelect setting to update (1-4) or press Enter to skip: ');
        switch (choice) {
            case '1':
                const newThreshold = await this.askQuestion('Enter new minimum profit threshold (%): ');
                if (!isNaN(parseFloat(newThreshold))) {
                    this.arbitrageStrategy.updateConfig({ minProfitThreshold: parseFloat(newThreshold) });
                    console.log(`✅ Min profit threshold updated to ${newThreshold}%`);
                }
                break;
            case '2':
                const newSize = await this.askQuestion('Enter new max position size (GALA): ');
                if (!isNaN(parseFloat(newSize))) {
                    this.arbitrageStrategy.updateConfig({ maxPositionSize: newSize });
                    console.log(`✅ Max position size updated to ${newSize} GALA`);
                }
                break;
            case '3':
                const newInterval = await this.askQuestion('Enter new check interval (seconds): ');
                if (!isNaN(parseInt(newInterval))) {
                    this.arbitrageStrategy.updateConfig({ checkInterval: parseInt(newInterval) * 1000 });
                    console.log(`✅ Check interval updated to ${newInterval} seconds`);
                }
                break;
            case '4':
                const newSlippage = await this.askQuestion('Enter new max slippage (%): ');
                if (!isNaN(parseFloat(newSlippage))) {
                    this.arbitrageStrategy.updateConfig({ maxSlippage: parseFloat(newSlippage) });
                    console.log(`✅ Max slippage updated to ${newSlippage}%`);
                }
                break;
        }
    }
    async manualScan() {
        console.log('🔍 Performing manual opportunity scan...');
        try {
            // This would trigger a manual scan
            // For now, we'll just show current opportunities
            await this.showCurrentOpportunities();
        }
        catch (error) {
            logger_1.Logger.error('❌ Manual scan failed:', error instanceof Error ? error.message : String(error));
        }
    }
    async showBotStatus() {
        const status = this.bot.getStatus();
        const opportunities = this.arbitrageStrategy.getCurrentOpportunities();
        console.log('\n🤖 Bot Status:');
        console.log(`🔗 Connected: ${status.connected ? '✅' : '❌'}`);
        console.log(`💰 Wallet: ${status.walletAddress}`);
        console.log(`📊 Error Count: ${status.errorCount}`);
        console.log(`🔄 Arbitrage Running: ${this.isRunning ? '✅' : '❌'}`);
        console.log(`📈 Current Opportunities: ${opportunities.length}`);
        console.log(`⏰ Last Activity: ${status.lastActivity || 'None'}`);
    }
    async showStatusUpdates() {
        const updateInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(updateInterval);
                return;
            }
            const opportunities = this.arbitrageStrategy.getCurrentOpportunities();
            if (opportunities.length > 0) {
                const best = opportunities[0];
                console.log(`\n💰 Best Opportunity: ${best.profitPercentage.toFixed(4)}% profit on ${best.amount} GALA`);
            }
            else {
                console.log('\n🔍 Scanning for opportunities...');
            }
        }, 30000); // Update every 30 seconds
    }
    async askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }
    async run() {
        try {
            await this.initialize();
            while (true) {
                await this.showMenu();
                const choice = await this.askQuestion('\nSelect an option (1-7): ');
                switch (choice) {
                    case '1':
                        await this.startArbitrage();
                        break;
                    case '2':
                        await this.stopArbitrage();
                        break;
                    case '3':
                        await this.showCurrentOpportunities();
                        break;
                    case '4':
                        await this.updateConfiguration();
                        break;
                    case '5':
                        await this.manualScan();
                        break;
                    case '6':
                        await this.showBotStatus();
                        break;
                    case '7':
                        console.log('\n👋 Goodbye!');
                        await this.cleanup();
                        return;
                    default:
                        console.log('❌ Invalid option. Please select 1-7.');
                }
                await this.askQuestion('\nPress Enter to continue...');
            }
        }
        catch (error) {
            logger_1.Logger.error('❌ Arbitrage bot failed', error);
        }
    }
    async cleanup() {
        if (this.isRunning) {
            this.arbitrageStrategy.stop();
        }
        await this.bot.disconnect();
        this.rl.close();
    }
}
// Run the arbitrage bot
async function main() {
    const bot = new ArbitrageBot();
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n👋 Shutting down arbitrage bot...');
        await bot.cleanup();
        process.exit(0);
    });
    await bot.run();
}
if (require.main === module) {
    main().catch((error) => {
        logger_1.Logger.error('Unhandled error in arbitrage bot', error);
        process.exit(1);
    });
}
//# sourceMappingURL=arbitrage-bot.js.map