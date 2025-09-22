#!/usr/bin/env ts-node
"use strict";
/**
 * Lunar Phase Trading Bot Example
 *
 * This example demonstrates how to use the Lunar Phase Strategy
 * to trade based on moon phases. The strategy follows the hypothesis
 * that lunar cycles may influence market sentiment and price movements.
 *
 * Trading Rules:
 * - New Moon: Buy signal (bullish sentiment)
 * - Full Moon: Sell signal (bearish sentiment)
 * - Waxing Moon: Gradual buying pressure
 * - Waning Moon: Gradual selling pressure
 *
 * Risk Management:
 * - Stop loss: 5% below entry price
 * - Take profit: 10% above entry price
 * - Position size: Based on signal confidence
 * - Time limit: Close positions after 7 days
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lunarStrategyExamples = void 0;
const CicadaBot_1 = require("../src/CicadaBot");
const logger_1 = require("../src/utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
async function main() {
    try {
        logger_1.Logger.info('🌙 Starting Lunar Phase Trading Bot Example');
        // Validate required environment variables
        const requiredEnvVars = ['PRIVATE_KEY', 'WALLET_ADDRESS'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }
        // Initialize the bot
        const bot = new CicadaBot_1.CicadaBot({
            privateKey: process.env.PRIVATE_KEY,
            walletAddress: process.env.WALLET_ADDRESS,
            gatewayBaseUrl: process.env.GATEWAY_BASE_URL,
            transactionWaitTimeoutMs: 30000,
            logLevel: 'info'
        });
        // Initialize the bot
        await bot.initialize();
        if (!bot.isReady()) {
            throw new Error('Bot is not ready for trading');
        }
        logger_1.Logger.info('✅ Bot initialized successfully');
        // Get current portfolio
        const portfolio = await bot.getPortfolioSummary();
        logger_1.Logger.info('📊 Current Portfolio:', {
            totalTokens: portfolio.totalTokens,
            tokens: portfolio.tokens.map(t => `${t.symbol}: ${t.balance}`),
            positions: portfolio.positions.length
        });
        // Configuration for lunar phase strategy
        const lunarConfig = {
            minTradeAmount: '10', // Minimum trade amount
            maxTradeAmount: '50', // Maximum trade amount
            checkInterval: 300000, // Check every 5 minutes
            maxSlippage: 0.5, // 0.5% slippage tolerance
            enabledTokens: ['GALA', 'USDC'], // Trade GALA/USDC pair
            strategy: 'both', // Use both new moon buy and full moon sell
            phaseThreshold: 2, // Trade within 2 days of major phases
            riskManagement: {
                stopLossPercentage: 5, // 5% stop loss
                takeProfitPercentage: 10, // 10% take profit
                maxPositionSize: 20 // Max 20% of balance per position
            }
        };
        logger_1.Logger.info('🌙 Starting Lunar Phase Strategy with config:', lunarConfig);
        // Start the lunar phase strategy
        const strategyResult = await bot.startArbitrageStrategy('lunar', lunarConfig);
        logger_1.Logger.info('✅ Lunar Phase Strategy started:', strategyResult);
        // Display current lunar phase information
        const lunarStrategy = bot.getCurrentStrategy();
        if (lunarStrategy && 'getCurrentLunarPhase' in lunarStrategy) {
            const currentPhase = lunarStrategy.getCurrentLunarPhase();
            logger_1.Logger.info('🌙 Current Lunar Phase:', {
                phase: currentPhase.phaseName,
                phaseValue: currentPhase.phase.toFixed(3),
                daysToNext: currentPhase.daysToNextPhase.toFixed(1),
                isNewMoon: currentPhase.isNewMoon,
                isFullMoon: currentPhase.isFullMoon,
                isWaxing: currentPhase.isWaxing,
                isWaning: currentPhase.isWaning
            });
        }
        // Monitor the strategy
        logger_1.Logger.info('🔄 Monitoring lunar phase strategy...');
        logger_1.Logger.info('Press Ctrl+C to stop the bot');
        // Set up graceful shutdown
        process.on('SIGINT', async () => {
            logger_1.Logger.info('🛑 Shutting down lunar trading bot...');
            try {
                await bot.stopArbitrageStrategy();
                await bot.disconnect();
                logger_1.Logger.info('✅ Bot stopped gracefully');
                process.exit(0);
            }
            catch (error) {
                logger_1.Logger.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        });
        // Keep the bot running
        setInterval(async () => {
            try {
                // Display strategy status
                const status = bot.getArbitrageStatus();
                const results = bot.getArbitrageResults();
                logger_1.Logger.info('📊 Strategy Status:', {
                    isRunning: status.isRunning,
                    strategy: status.strategy,
                    resultsCount: status.resultsCount,
                    recentResults: results.slice(0, 3).map(r => ({
                        type: r.type,
                        timestamp: r.timestamp,
                        amount: r.amount,
                        profitPercentage: r.profitPercentage
                    }))
                });
                // Display current position if any
                if (lunarStrategy && 'getCurrentPosition' in lunarStrategy) {
                    const position = lunarStrategy.getCurrentPosition();
                    if (position) {
                        logger_1.Logger.info('💼 Current Position:', {
                            pair: `${position.tokenIn}/${position.tokenOut}`,
                            amount: position.amount,
                            entryPrice: position.entryPrice,
                            entryDate: position.entryDate,
                            stopLoss: position.stopLoss,
                            takeProfit: position.takeProfit
                        });
                    }
                }
            }
            catch (error) {
                logger_1.Logger.error('❌ Error in monitoring loop:', error);
            }
        }, 60000); // Check every minute
    }
    catch (error) {
        logger_1.Logger.error('❌ Fatal error:', error);
        process.exit(1);
    }
}
// Example of different lunar strategy configurations
exports.lunarStrategyExamples = {
    // Conservative strategy - only trade on major phases
    conservative: {
        minTradeAmount: '5',
        maxTradeAmount: '25',
        checkInterval: 600000, // 10 minutes
        maxSlippage: 0.3,
        enabledTokens: ['GALA', 'USDC'],
        strategy: 'both',
        phaseThreshold: 1, // Only trade within 1 day of major phases
        riskManagement: {
            stopLossPercentage: 3,
            takeProfitPercentage: 8,
            maxPositionSize: 10
        }
    },
    // Aggressive strategy - trade on all phases
    aggressive: {
        minTradeAmount: '20',
        maxTradeAmount: '100',
        checkInterval: 180000, // 3 minutes
        maxSlippage: 0.8,
        enabledTokens: ['GALA', 'USDC'],
        strategy: 'both',
        phaseThreshold: 3, // Trade within 3 days of major phases
        riskManagement: {
            stopLossPercentage: 8,
            takeProfitPercentage: 15,
            maxPositionSize: 30
        }
    },
    // New moon only strategy
    newMoonOnly: {
        minTradeAmount: '15',
        maxTradeAmount: '75',
        checkInterval: 300000, // 5 minutes
        maxSlippage: 0.5,
        enabledTokens: ['GALA', 'USDC'],
        strategy: 'new-moon-buy',
        phaseThreshold: 2,
        riskManagement: {
            stopLossPercentage: 5,
            takeProfitPercentage: 12,
            maxPositionSize: 25
        }
    },
    // Full moon only strategy
    fullMoonOnly: {
        minTradeAmount: '15',
        maxTradeAmount: '75',
        checkInterval: 300000, // 5 minutes
        maxSlippage: 0.5,
        enabledTokens: ['GALA', 'USDC'],
        strategy: 'full-moon-sell',
        phaseThreshold: 2,
        riskManagement: {
            stopLossPercentage: 5,
            takeProfitPercentage: 12,
            maxPositionSize: 25
        }
    }
};
// Run the example
if (require.main === module) {
    main().catch(error => {
        logger_1.Logger.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=lunar-trading-bot.js.map