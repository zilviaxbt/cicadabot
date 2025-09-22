"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const tokens_1 = require("../src/constants/tokens");
/**
 * Test swap functionality with your GALA balance
 */
async function swapTest() {
    try {
        // Load configuration
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('Starting swap test with 1997 GALA...');
        // Initialize bot
        const bot = new CicadaBot_1.CicadaBot(config);
        await bot.initialize();
        logger_1.Logger.info('✅ Bot initialized successfully');
        // Test 1: Get quote for different amounts
        const testAmounts = ['10', '50', '100', '500'];
        for (const amount of testAmounts) {
            logger_1.Logger.info(`\n=== Testing quote for ${amount} GALA → USDC ===`);
            try {
                const quote = await bot.getQuote({
                    tokenIn: tokens_1.COMMON_TOKENS.GALA,
                    tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                    amountIn: amount,
                    slippageTolerance: 0.5,
                    feeTier: tokens_1.FEE_TIERS.LOW
                });
                logger_1.Logger.info(`✅ Quote for ${amount} GALA:`, {
                    amountIn: quote.amountIn,
                    amountOut: quote.amountOut,
                    priceImpact: quote.priceImpact,
                    feeTier: quote.feeTier,
                    currentPrice: quote.currentPrice,
                    newPrice: quote.newPrice
                });
                // Calculate effective price
                const effectivePrice = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);
                logger_1.Logger.info(`💰 Effective price: 1 GALA = ${effectivePrice.toFixed(6)} USDC`);
            }
            catch (error) {
                logger_1.Logger.warn(`⚠️ Quote failed for ${amount} GALA:`, error instanceof Error ? error.message : String(error));
            }
        }
        // Test 2: Get current market price
        logger_1.Logger.info('\n=== Current Market Price ===');
        try {
            const price = await bot.getCurrentPrice(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC);
            logger_1.Logger.info(`💰 Current GALA/USDC price: ${price}`);
        }
        catch (error) {
            logger_1.Logger.warn('⚠️ Price fetch failed:', error instanceof Error ? error.message : String(error));
        }
        // Test 3: Test different fee tiers
        logger_1.Logger.info('\n=== Testing Different Fee Tiers ===');
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
                    amountIn: '100',
                    slippageTolerance: 0.5,
                    feeTier: tier
                });
                logger_1.Logger.info(`✅ ${name} fee tier:`, {
                    amountOut: quote.amountOut,
                    priceImpact: quote.priceImpact
                });
            }
            catch (error) {
                logger_1.Logger.warn(`⚠️ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
            }
        }
        // Test 4: Example of how to execute a swap (commented out for safety)
        logger_1.Logger.info('\n=== Swap Execution Example (Commented Out) ===');
        logger_1.Logger.info('To execute a swap, uncomment the code below:');
        logger_1.Logger.info(`
    const swapResult = await bot.executeSwap({
      tokenIn: COMMON_TOKENS.GALA,
      tokenOut: COMMON_TOKENS.GUSDC,
      amountIn: '10', // Small amount for testing
      slippageTolerance: 1.0, // 1% slippage tolerance
      feeTier: FEE_TIERS.LOW
    });
    
    if (swapResult.success) {
      Logger.info('✅ Swap successful!', {
        transactionHash: swapResult.transactionHash,
        amountIn: swapResult.amountIn,
        amountOut: swapResult.amountOut
      });
    } else {
      Logger.error('❌ Swap failed:', swapResult.error);
    }
    `);
        // Cleanup
        await bot.disconnect();
        logger_1.Logger.info('\n✅ Swap test completed successfully');
    }
    catch (error) {
        logger_1.Logger.error('❌ Swap test failed', error);
        throw error;
    }
}
// Run the test
if (require.main === module) {
    swapTest().catch((error) => {
        logger_1.Logger.error('Unhandled error in swap test', error);
        process.exit(1);
    });
}
//# sourceMappingURL=swap-test.js.map