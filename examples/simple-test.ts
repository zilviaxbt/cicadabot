import { CicadaBot } from '../src/CicadaBot';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../src/constants/tokens';

/**
 * Simple test to verify basic bot functionality
 */
async function simpleTest() {
  try {
    // Load configuration
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('Starting simple test...');

    // Initialize bot
    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('✅ Bot initialized successfully');

    // Test 1: Get bot status
    const status = bot.getStatus();
    Logger.info('✅ Bot status:', {
      connected: status.connected,
      walletAddress: status.walletAddress,
      errorCount: status.errorCount
    });

    // Test 2: Try to get a quote (this should work even without assets)
    Logger.info('Testing quote functionality...');
    try {
      const quote = await bot.getQuote({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC,
        amountIn: '100',
        slippageTolerance: 0.5,
        feeTier: FEE_TIERS.LOW
      });
      
      Logger.info('✅ Quote successful:', {
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        feeTier: quote.feeTier
      });
    } catch (error) {
      Logger.warn('⚠️ Quote failed (this might be normal if no liquidity):', error instanceof Error ? error.message : String(error));
    }

    // Test 3: Try to get current price
    Logger.info('Testing price functionality...');
    try {
      const price = await bot.getCurrentPrice(COMMON_TOKENS.GALA, COMMON_TOKENS.GUSDC);
      Logger.info('✅ Current price:', price);
    } catch (error) {
      Logger.warn('⚠️ Price fetch failed:', error instanceof Error ? error.message : String(error));
    }

    // Test 4: Try to get token balance (this might fail if wallet is empty)
    Logger.info('Testing balance functionality...');
    try {
      const galaBalance = await bot.getTokenBalance(COMMON_TOKENS.GALA);
      Logger.info('✅ GALA balance:', galaBalance);
    } catch (error) {
      Logger.warn('⚠️ Balance fetch failed (wallet might be empty):', error instanceof Error ? error.message : String(error));
    }

    // Cleanup
    await bot.disconnect();
    Logger.info('✅ Test completed successfully');

  } catch (error) {
    Logger.error('❌ Test failed', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  simpleTest().catch((error) => {
    Logger.error('Unhandled error in test', error);
    process.exit(1);
  });
}
