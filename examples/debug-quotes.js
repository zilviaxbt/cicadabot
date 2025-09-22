"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const tokens_1 = require("../src/constants/tokens");
/**
 * Debug script to identify quote issues
 */
async function debugQuotes() {
    try {
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('🔍 Starting Quote Debug Session...');
        const bot = new CicadaBot_1.CicadaBot(config);
        await bot.initialize();
        logger_1.Logger.info('✅ Bot initialized successfully');
        // Test 1: Basic quote functionality
        logger_1.Logger.info('\n=== Test 1: Basic Quote ===');
        try {
            const quote = await bot.getQuote({
                tokenIn: tokens_1.COMMON_TOKENS.GALA,
                tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                amountIn: '10',
                slippageTolerance: 0.5,
                feeTier: tokens_1.FEE_TIERS.LOW
            });
            logger_1.Logger.info('✅ Basic quote successful:', {
                amountIn: quote.amountIn,
                amountOut: quote.amountOut,
                priceImpact: quote.priceImpact,
                feeTier: quote.feeTier
            });
        }
        catch (error) {
            logger_1.Logger.error('❌ Basic quote failed:', error instanceof Error ? error.message : String(error));
        }
        // Test 2: Test all fee tiers
        logger_1.Logger.info('\n=== Test 2: All Fee Tiers ===');
        const feeTiers = [
            { tier: tokens_1.FEE_TIERS.LOW, name: '0.05%' },
            { tier: tokens_1.FEE_TIERS.MEDIUM, name: '0.30%' },
            { tier: tokens_1.FEE_TIERS.HIGH, name: '1.00%' }
        ];
        for (const { tier, name } of feeTiers) {
            try {
                const quote = await bot.getQuote({
                    tokenIn: tokens_1.COMMON_TOKENS.GALA,
                    tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                    amountIn: '10',
                    slippageTolerance: 0.5,
                    feeTier: tier
                });
                logger_1.Logger.info(`✅ ${name} fee tier:`, {
                    amountOut: quote.amountOut,
                    priceImpact: quote.priceImpact
                });
            }
            catch (error) {
                logger_1.Logger.error(`❌ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
            }
        }
        // Test 3: Test different amounts
        logger_1.Logger.info('\n=== Test 3: Different Amounts ===');
        const amounts = ['1', '5', '10', '25', '50', '100'];
        for (const amount of amounts) {
            try {
                const quote = await bot.getQuote({
                    tokenIn: tokens_1.COMMON_TOKENS.GALA,
                    tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                    amountIn: amount,
                    slippageTolerance: 0.5,
                    feeTier: tokens_1.FEE_TIERS.LOW
                });
                logger_1.Logger.info(`✅ ${amount} GALA:`, {
                    amountOut: quote.amountOut,
                    priceImpact: quote.priceImpact
                });
            }
            catch (error) {
                logger_1.Logger.error(`❌ ${amount} GALA failed:`, error instanceof Error ? error.message : String(error));
            }
        }
        // Test 4: Reverse quotes (USDC → GALA)
        logger_1.Logger.info('\n=== Test 4: Reverse Quotes ===');
        try {
            const reverseQuote = await bot.getQuote({
                tokenIn: tokens_1.COMMON_TOKENS.GUSDC,
                tokenOut: tokens_1.COMMON_TOKENS.GALA,
                amountIn: '1',
                slippageTolerance: 0.5,
                feeTier: tokens_1.FEE_TIERS.LOW
            });
            logger_1.Logger.info('✅ Reverse quote successful:', {
                amountIn: reverseQuote.amountIn,
                amountOut: reverseQuote.amountOut,
                priceImpact: reverseQuote.priceImpact
            });
        }
        catch (error) {
            logger_1.Logger.error('❌ Reverse quote failed:', error instanceof Error ? error.message : String(error));
        }
        // Test 5: Current price check
        logger_1.Logger.info('\n=== Test 5: Current Price ===');
        try {
            const price = await bot.getCurrentPrice(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC);
            logger_1.Logger.info('✅ Current price:', price);
        }
        catch (error) {
            logger_1.Logger.error('❌ Price check failed:', error instanceof Error ? error.message : String(error));
        }
        // Test 6: Network connectivity
        logger_1.Logger.info('\n=== Test 6: Network Status ===');
        const status = bot.getStatus();
        logger_1.Logger.info('Network status:', {
            connected: status.connected,
            errorCount: status.errorCount,
            walletAddress: status.walletAddress
        });
        await bot.disconnect();
        logger_1.Logger.info('\n✅ Debug session completed');
    }
    catch (error) {
        logger_1.Logger.error('❌ Debug session failed', error);
    }
}
// Run the debug script
if (require.main === module) {
    debugQuotes().catch((error) => {
        logger_1.Logger.error('Unhandled error in debug script', error);
        process.exit(1);
    });
}
//# sourceMappingURL=debug-quotes.js.map