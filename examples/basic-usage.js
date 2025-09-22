"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const tokens_1 = require("../src/constants/tokens");
/**
 * Basic usage example for Cicada Bot
 * This example demonstrates:
 * - Bot initialization
 * - Getting quotes
 * - Executing swaps
 * - Portfolio monitoring
 */
async function basicUsageExample() {
    try {
        // Load configuration
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('Starting basic usage example...');
        // Initialize bot
        const bot = new CicadaBot_1.CicadaBot(config);
        await bot.initialize();
        logger_1.Logger.info('Bot initialized successfully');
        // 1. Get portfolio summary
        logger_1.Logger.info('=== Portfolio Summary ===');
        const portfolio = await bot.getPortfolioSummary();
        logger_1.Logger.info(`Total tokens: ${portfolio.totalTokens}`);
        logger_1.Logger.info(`Active positions: ${portfolio.positions.length}`);
        portfolio.tokens.forEach(token => {
            logger_1.Logger.info(`${token.symbol}: ${token.balance} (verified: ${token.verified})`);
        });
        // 2. Get a quote for GALA to USDC
        logger_1.Logger.info('\n=== Getting Quote ===');
        const quote = await bot.getQuote({
            tokenIn: tokens_1.COMMON_TOKENS.GALA,
            tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
            amountIn: '100',
            slippageTolerance: 0.5,
            feeTier: tokens_1.FEE_TIERS.LOW
        });
        logger_1.Logger.info(`Quote: 100 GALA → ${quote.amountOut} USDC`);
        logger_1.Logger.info(`Price impact: ${quote.priceImpact}%`);
        logger_1.Logger.info(`Fee tier: ${quote.feeTier} (${quote.feeTier / 100}%)`);
        // 3. Get current price
        logger_1.Logger.info('\n=== Current Price ===');
        const price = await bot.getCurrentPrice(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC);
        logger_1.Logger.info(`Current GALA/USDC price: ${price}`);
        // 4. Check token balances
        logger_1.Logger.info('\n=== Token Balances ===');
        const galaBalance = await bot.getTokenBalance(tokens_1.COMMON_TOKENS.GALA);
        const usdcBalance = await bot.getTokenBalance(tokens_1.COMMON_TOKENS.GUSDC);
        logger_1.Logger.info(`GALA balance: ${galaBalance}`);
        logger_1.Logger.info(`USDC balance: ${usdcBalance}`);
        // 5. Example swap execution (commented out for safety)
        /*
        Logger.info('\n=== Executing Swap ===');
        const swapResult = await bot.executeSwap({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: '10', // Small amount for testing
          slippageTolerance: 1.0,
          feeTier: FEE_TIERS.LOW
        });
        
        if (swapResult.success) {
          Logger.info('Swap successful!', {
            transactionHash: swapResult.transactionHash,
            amountIn: swapResult.amountIn,
            amountOut: swapResult.amountOut
          });
        } else {
          Logger.error('Swap failed:', swapResult.error);
        }
        */
        // Cleanup
        await bot.disconnect();
        logger_1.Logger.info('Example completed successfully');
    }
    catch (error) {
        logger_1.Logger.error('Example failed', error);
        throw error;
    }
}
// Run the example
if (require.main === module) {
    basicUsageExample().catch((error) => {
        logger_1.Logger.error('Unhandled error in example', error);
        process.exit(1);
    });
}
//# sourceMappingURL=basic-usage.js.map