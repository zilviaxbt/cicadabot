"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const tokens_1 = require("../src/constants/tokens");
/**
 * Advanced trading example for GalaSwap Bot
 * This example demonstrates:
 * - Multiple token swaps
 * - Price monitoring
 * - Error handling
 * - Portfolio rebalancing
 */
class AdvancedTradingBot extends CicadaBot_1.CicadaBot {
    constructor(config) {
        super(config);
        this.priceHistory = new Map();
        this.maxPriceHistory = 10;
    }
    /**
     * Monitor price changes for a token pair
     */
    async monitorPrice(tokenIn, tokenOut, duration = 60000) {
        logger_1.Logger.info(`Starting price monitoring for ${tokenIn}/${tokenOut} for ${duration}ms`);
        const startTime = Date.now();
        const interval = setInterval(async () => {
            try {
                const price = await this.getCurrentPrice(tokenIn, tokenOut);
                const priceNum = parseFloat(price);
                // Store price history
                const key = `${tokenIn}/${tokenOut}`;
                if (!this.priceHistory.has(key)) {
                    this.priceHistory.set(key, []);
                }
                const history = this.priceHistory.get(key);
                history.push(priceNum);
                if (history.length > this.maxPriceHistory) {
                    history.shift();
                }
                logger_1.Logger.info(`Price update: ${price} (${history.length} samples)`);
                // Check for significant price changes
                if (history.length >= 2) {
                    const change = ((priceNum - history[history.length - 2]) / history[history.length - 2]) * 100;
                    if (Math.abs(change) > 5) { // 5% change threshold
                        logger_1.Logger.warn(`Significant price change detected: ${change.toFixed(2)}%`);
                    }
                }
            }
            catch (error) {
                logger_1.Logger.error('Error monitoring price', error);
            }
        }, 5000); // Check every 5 seconds
        // Stop monitoring after duration
        setTimeout(() => {
            clearInterval(interval);
            logger_1.Logger.info('Price monitoring stopped');
        }, duration);
    }
    /**
     * Execute multiple swaps with error handling
     */
    async executeMultipleSwaps(swaps) {
        logger_1.Logger.info(`Executing ${swaps.length} swaps`);
        for (let i = 0; i < swaps.length; i++) {
            const swap = swaps[i];
            logger_1.Logger.info(`Executing swap ${i + 1}/${swaps.length}: ${swap.tokenIn} → ${swap.tokenOut}`);
            try {
                const result = await this.executeSwap(swap);
                if (result.success) {
                    logger_1.Logger.info(`Swap ${i + 1} successful:`, {
                        transactionHash: result.transactionHash,
                        amountIn: result.amountIn,
                        amountOut: result.amountOut
                    });
                }
                else {
                    logger_1.Logger.error(`Swap ${i + 1} failed:`, result.error);
                }
                // Wait between swaps to avoid rate limiting
                if (i < swaps.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            catch (error) {
                logger_1.Logger.error(`Swap ${i + 1} threw error:`, error);
            }
        }
    }
    /**
     * Simple portfolio rebalancing strategy
     */
    async rebalancePortfolio(targetRatios) {
        logger_1.Logger.info('Starting portfolio rebalancing');
        try {
            const portfolio = await this.getPortfolioSummary();
            const totalValue = portfolio.tokens.reduce((sum, token) => {
                // This is a simplified calculation - in reality you'd need USD values
                return sum + parseFloat(token.balance);
            }, 0);
            logger_1.Logger.info(`Total portfolio value: ${totalValue}`);
            // Calculate required trades
            const trades = [];
            for (const [tokenSymbol, targetRatio] of targetRatios) {
                const token = portfolio.tokens.find(t => t.symbol === tokenSymbol);
                if (!token)
                    continue;
                const currentValue = parseFloat(token.balance);
                const targetValue = totalValue * targetRatio;
                const difference = targetValue - currentValue;
                if (Math.abs(difference) > totalValue * 0.05) { // 5% threshold
                    logger_1.Logger.info(`Rebalancing needed for ${tokenSymbol}: ${difference}`);
                    // This is simplified - you'd need to determine which token to swap to/from
                    // and handle the actual swap logic based on your rebalancing strategy
                }
            }
            logger_1.Logger.info('Portfolio rebalancing analysis complete');
        }
        catch (error) {
            logger_1.Logger.error('Portfolio rebalancing failed', error);
        }
    }
    /**
     * Get price statistics
     */
    getPriceStats(tokenIn, tokenOut) {
        const key = `${tokenIn}/${tokenOut}`;
        const history = this.priceHistory.get(key);
        if (!history || history.length < 2) {
            return null;
        }
        const avg = history.reduce((sum, price) => sum + price, 0) / history.length;
        const min = Math.min(...history);
        const max = Math.max(...history);
        // Calculate volatility (standard deviation)
        const variance = history.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / history.length;
        const volatility = Math.sqrt(variance);
        return { avg, min, max, volatility };
    }
}
async function advancedTradingExample() {
    try {
        // Load configuration
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('Starting advanced trading example...');
        // Initialize advanced bot
        const bot = new AdvancedTradingBot(config);
        await bot.initialize();
        logger_1.Logger.info('Advanced bot initialized successfully');
        // 1. Price monitoring example
        logger_1.Logger.info('\n=== Price Monitoring ===');
        await bot.monitorPrice(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC, 30000); // Monitor for 30 seconds
        // 2. Multiple swaps example (commented out for safety)
        /*
        Logger.info('\n=== Multiple Swaps ===');
        const swaps: SwapParams[] = [
          {
            tokenIn: COMMON_TOKENS.GALA,
            tokenOut: COMMON_TOKENS.GUSDC,
            amountIn: '10',
            slippageTolerance: 1.0,
            feeTier: FEE_TIERS.LOW
          },
          {
            tokenIn: COMMON_TOKENS.GUSDC,
            tokenOut: COMMON_TOKENS.GALA,
            amountIn: '5',
            slippageTolerance: 1.0,
            feeTier: FEE_TIERS.LOW
          }
        ];
        
        await bot.executeMultipleSwaps(swaps);
        */
        // 3. Portfolio rebalancing example
        logger_1.Logger.info('\n=== Portfolio Rebalancing ===');
        const targetRatios = new Map([
            ['GALA', 0.6], // 60% GALA
            ['USDC', 0.4] // 40% USDC
        ]);
        await bot.rebalancePortfolio(targetRatios);
        // 4. Price statistics
        logger_1.Logger.info('\n=== Price Statistics ===');
        const stats = bot.getPriceStats(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC);
        if (stats) {
            logger_1.Logger.info('Price statistics:', {
                average: stats.avg.toFixed(6),
                minimum: stats.min.toFixed(6),
                maximum: stats.max.toFixed(6),
                volatility: stats.volatility.toFixed(6)
            });
        }
        else {
            logger_1.Logger.info('Insufficient price data for statistics');
        }
        // Cleanup
        await bot.disconnect();
        logger_1.Logger.info('Advanced trading example completed successfully');
    }
    catch (error) {
        logger_1.Logger.error('Advanced trading example failed', error);
        throw error;
    }
}
// Run the example
if (require.main === module) {
    advancedTradingExample().catch((error) => {
        logger_1.Logger.error('Unhandled error in advanced example', error);
        process.exit(1);
    });
}
//# sourceMappingURL=advanced-trading.js.map