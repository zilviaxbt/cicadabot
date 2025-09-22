"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const tokens_1 = require("../src/constants/tokens");
/**
 * Simple test to verify basic bot functionality
 */
async function simpleTest() {
    try {
        // Load configuration
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('Starting simple test...');
        // Initialize bot
        const bot = new CicadaBot_1.CicadaBot(config);
        await bot.initialize();
        logger_1.Logger.info('✅ Bot initialized successfully');
        // Test 1: Get bot status
        const status = bot.getStatus();
        logger_1.Logger.info('✅ Bot status:', {
            connected: status.connected,
            walletAddress: status.walletAddress,
            errorCount: status.errorCount
        });
        // Test 2: Try to get a quote (this should work even without assets)
        logger_1.Logger.info('Testing quote functionality...');
        try {
            const quote = await bot.getQuote({
                tokenIn: tokens_1.COMMON_TOKENS.GALA,
                tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                amountIn: '100',
                slippageTolerance: 0.5,
                feeTier: tokens_1.FEE_TIERS.LOW
            });
            logger_1.Logger.info('✅ Quote successful:', {
                amountIn: quote.amountIn,
                amountOut: quote.amountOut,
                priceImpact: quote.priceImpact,
                feeTier: quote.feeTier
            });
        }
        catch (error) {
            logger_1.Logger.warn('⚠️ Quote failed (this might be normal if no liquidity):', error instanceof Error ? error.message : String(error));
        }
        // Test 3: Try to get current price
        logger_1.Logger.info('Testing price functionality...');
        try {
            const price = await bot.getCurrentPrice(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC);
            logger_1.Logger.info('✅ Current price:', price);
        }
        catch (error) {
            logger_1.Logger.warn('⚠️ Price fetch failed:', error instanceof Error ? error.message : String(error));
        }
        // Test 4: Try to get token balance (this might fail if wallet is empty)
        logger_1.Logger.info('Testing balance functionality...');
        try {
            const galaBalance = await bot.getTokenBalance(tokens_1.COMMON_TOKENS.GALA);
            logger_1.Logger.info('✅ GALA balance:', galaBalance);
        }
        catch (error) {
            logger_1.Logger.warn('⚠️ Balance fetch failed (wallet might be empty):', error instanceof Error ? error.message : String(error));
        }
        // Cleanup
        await bot.disconnect();
        logger_1.Logger.info('✅ Test completed successfully');
    }
    catch (error) {
        logger_1.Logger.error('❌ Test failed', error);
        throw error;
    }
}
// Run the test
if (require.main === module) {
    simpleTest().catch((error) => {
        logger_1.Logger.error('Unhandled error in test', error);
        process.exit(1);
    });
}
//# sourceMappingURL=simple-test.js.map