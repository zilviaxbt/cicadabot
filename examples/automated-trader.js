"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const tokens_1 = require("../src/constants/tokens");
/**
 * Automated Trading Script
 * Executes predefined trading strategies
 */
class AutomatedTrader {
    constructor() {
        this.isRunning = false;
    }
    async initialize() {
        try {
            const config = (0, config_1.loadConfig)();
            (0, config_1.validateConfig)(config);
            logger_1.Logger.info('🤖 Initializing Automated Trader...');
            this.bot = new CicadaBot_1.CicadaBot(config);
            await this.bot.initialize();
            logger_1.Logger.info('✅ Automated Trader initialized');
        }
        catch (error) {
            logger_1.Logger.error('❌ Failed to initialize automated trader', error);
            throw error;
        }
    }
    /**
     * Simple DCA (Dollar Cost Averaging) Strategy
     * Swaps a fixed amount of GALA to USDC at regular intervals
     */
    async dcaStrategy(amount, intervalMinutes, totalTrades) {
        logger_1.Logger.info(`🔄 Starting DCA Strategy: ${amount} GALA every ${intervalMinutes} minutes for ${totalTrades} trades`);
        this.isRunning = true;
        let tradeCount = 0;
        while (this.isRunning && tradeCount < totalTrades) {
            try {
                tradeCount++;
                logger_1.Logger.info(`\n📊 Trade ${tradeCount}/${totalTrades}`);
                // Get quote first
                const quote = await this.bot.getQuote({
                    tokenIn: tokens_1.COMMON_TOKENS.GALA,
                    tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                    amountIn: amount,
                    slippageTolerance: 1.0,
                    feeTier: tokens_1.FEE_TIERS.LOW
                });
                logger_1.Logger.info(`💰 Quote: ${amount} GALA → ${quote.amountOut} USDC (${quote.priceImpact}% impact)`);
                // Execute swap
                const result = await this.bot.executeSwap({
                    tokenIn: tokens_1.COMMON_TOKENS.GALA,
                    tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                    amountIn: amount,
                    slippageTolerance: 1.0,
                    feeTier: tokens_1.FEE_TIERS.LOW
                });
                if (result.success) {
                    logger_1.Logger.info(`✅ Trade ${tradeCount} successful: ${result.transactionHash}`);
                }
                else {
                    logger_1.Logger.error(`❌ Trade ${tradeCount} failed: ${result.error}`);
                }
                // Wait for next trade (except for the last one)
                if (tradeCount < totalTrades && this.isRunning) {
                    logger_1.Logger.info(`⏰ Waiting ${intervalMinutes} minutes for next trade...`);
                    await this.sleep(intervalMinutes * 60 * 1000);
                }
            }
            catch (error) {
                logger_1.Logger.error(`❌ Trade ${tradeCount} error:`, error instanceof Error ? error.message : String(error));
                // Wait before retrying
                if (tradeCount < totalTrades) {
                    await this.sleep(30000); // 30 seconds
                }
            }
        }
        logger_1.Logger.info(`🏁 DCA Strategy completed. Executed ${tradeCount} trades.`);
    }
    /**
     * Price-based trading strategy
     * Swaps when price reaches certain thresholds
     */
    async priceBasedStrategy(amount, targetPrice, direction) {
        logger_1.Logger.info(`📈 Starting Price-based Strategy: Swap ${amount} GALA when price goes ${direction} ${targetPrice}`);
        this.isRunning = true;
        let checkCount = 0;
        while (this.isRunning) {
            try {
                checkCount++;
                const currentPrice = await this.bot.getCurrentPrice(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC);
                const priceNum = parseFloat(currentPrice);
                logger_1.Logger.info(`📊 Check ${checkCount}: Current price = ${priceNum.toFixed(6)} (target: ${targetPrice})`);
                const shouldTrade = direction === 'above' ? priceNum >= targetPrice : priceNum <= targetPrice;
                if (shouldTrade) {
                    logger_1.Logger.info(`🎯 Target price reached! Executing trade...`);
                    const result = await this.bot.executeSwap({
                        tokenIn: tokens_1.COMMON_TOKENS.GALA,
                        tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                        amountIn: amount,
                        slippageTolerance: 1.0,
                        feeTier: tokens_1.FEE_TIERS.LOW
                    });
                    if (result.success) {
                        logger_1.Logger.info(`✅ Price-based trade successful: ${result.transactionHash}`);
                        break; // Exit after successful trade
                    }
                    else {
                        logger_1.Logger.error(`❌ Price-based trade failed: ${result.error}`);
                    }
                }
                // Check every 30 seconds
                await this.sleep(30000);
            }
            catch (error) {
                logger_1.Logger.error(`❌ Price check error:`, error instanceof Error ? error.message : String(error));
                await this.sleep(30000);
            }
        }
    }
    /**
     * Simple arbitrage strategy
     * Compares prices across different fee tiers
     */
    async arbitrageStrategy(amount) {
        logger_1.Logger.info(`🔄 Starting Arbitrage Strategy: ${amount} GALA`);
        try {
            const feeTiers = [
                { tier: tokens_1.FEE_TIERS.LOW, name: '0.05%' },
                { tier: tokens_1.FEE_TIERS.MEDIUM, name: '0.30%' },
                { tier: tokens_1.FEE_TIERS.HIGH, name: '1.00%' }
            ];
            const quotes = [];
            // Get quotes from all available fee tiers
            for (const { tier, name } of feeTiers) {
                try {
                    const quote = await this.bot.getQuote({
                        tokenIn: tokens_1.COMMON_TOKENS.GALA,
                        tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
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
                    logger_1.Logger.info(`📊 ${name} fee tier: ${quote.amountOut} USDC (${quote.priceImpact}% impact)`);
                }
                catch (error) {
                    logger_1.Logger.warn(`⚠️ ${name} fee tier not available`);
                }
            }
            if (quotes.length === 0) {
                logger_1.Logger.error('❌ No quotes available for arbitrage');
                return;
            }
            // Find the best quote
            const bestQuote = quotes.reduce((best, current) => parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best);
            logger_1.Logger.info(`🏆 Best quote: ${bestQuote.name} fee tier → ${bestQuote.amountOut} USDC`);
            // Execute trade with best quote
            const result = await this.bot.executeSwap({
                tokenIn: tokens_1.COMMON_TOKENS.GALA,
                tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                amountIn: amount,
                slippageTolerance: 0.5,
                feeTier: bestQuote.tier
            });
            if (result.success) {
                logger_1.Logger.info(`✅ Arbitrage trade successful: ${result.transactionHash}`);
            }
            else {
                logger_1.Logger.error(`❌ Arbitrage trade failed: ${result.error}`);
            }
        }
        catch (error) {
            logger_1.Logger.error('❌ Arbitrage strategy failed:', error instanceof Error ? error.message : String(error));
        }
    }
    stop() {
        this.isRunning = false;
        logger_1.Logger.info('🛑 Automated trading stopped');
    }
    sleep(ms) {
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
    }
    catch (error) {
        logger_1.Logger.error('❌ Automated trader failed', error);
    }
    finally {
        await trader.cleanup();
    }
}
// Run the automated trader
if (require.main === module) {
    runAutomatedTrader().catch((error) => {
        logger_1.Logger.error('Unhandled error in automated trader', error);
        process.exit(1);
    });
}
//# sourceMappingURL=automated-trader.js.map