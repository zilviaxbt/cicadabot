import { CicadaBot } from '../src/CicadaBot';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../src/constants/tokens';

/**
 * Debug script to identify quote issues
 */
async function debugQuotes() {
  try {
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('🔍 Starting Quote Debug Session...');

    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('✅ Bot initialized successfully');

    // Test 1: Basic quote functionality
    Logger.info('\n=== Test 1: Basic Quote ===');
    try {
      const quote = await bot.getQuote({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC,
        amountIn: '10',
        slippageTolerance: 0.5,
        feeTier: FEE_TIERS.LOW
      });
      
      Logger.info('✅ Basic quote successful:', {
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        feeTier: quote.feeTier
      });
    } catch (error) {
      Logger.error('❌ Basic quote failed:', error instanceof Error ? error.message : String(error));
    }

    // Test 2: Test all fee tiers
    Logger.info('\n=== Test 2: All Fee Tiers ===');
    const feeTiers = [
      { tier: FEE_TIERS.LOW, name: '0.05%' },
      { tier: FEE_TIERS.MEDIUM, name: '0.30%' },
      { tier: FEE_TIERS.HIGH, name: '1.00%' }
    ];

    for (const { tier, name } of feeTiers) {
      try {
        const quote = await bot.getQuote({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: '10',
          slippageTolerance: 0.5,
          feeTier: tier
        });
        
        Logger.info(`✅ ${name} fee tier:`, {
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact
        });
      } catch (error) {
        Logger.error(`❌ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Test 3: Test different amounts
    Logger.info('\n=== Test 3: Different Amounts ===');
    const amounts = ['1', '5', '10', '25', '50', '100'];
    
    for (const amount of amounts) {
      try {
        const quote = await bot.getQuote({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: amount,
          slippageTolerance: 0.5,
          feeTier: FEE_TIERS.LOW
        });
        
        Logger.info(`✅ ${amount} GALA:`, {
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact
        });
      } catch (error) {
        Logger.error(`❌ ${amount} GALA failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Test 4: Reverse quotes (USDC → GALA)
    Logger.info('\n=== Test 4: Reverse Quotes ===');
    try {
      const reverseQuote = await bot.getQuote({
        tokenIn: COMMON_TOKENS.GUSDC,
        tokenOut: COMMON_TOKENS.GALA,
        amountIn: '1',
        slippageTolerance: 0.5,
        feeTier: FEE_TIERS.LOW
      });
      
      Logger.info('✅ Reverse quote successful:', {
        amountIn: reverseQuote.amountIn,
        amountOut: reverseQuote.amountOut,
        priceImpact: reverseQuote.priceImpact
      });
    } catch (error) {
      Logger.error('❌ Reverse quote failed:', error instanceof Error ? error.message : String(error));
    }

    // Test 5: Current price check
    Logger.info('\n=== Test 5: Current Price ===');
    try {
      const price = await bot.getCurrentPrice(COMMON_TOKENS.GALA, COMMON_TOKENS.GUSDC);
      Logger.info('✅ Current price:', price);
    } catch (error) {
      Logger.error('❌ Price check failed:', error instanceof Error ? error.message : String(error));
    }

    // Test 6: Network connectivity
    Logger.info('\n=== Test 6: Network Status ===');
    const status = bot.getStatus();
    Logger.info('Network status:', {
      connected: status.connected,
      errorCount: status.errorCount,
      walletAddress: status.walletAddress
    });

    await bot.disconnect();
    Logger.info('\n✅ Debug session completed');

  } catch (error) {
    Logger.error('❌ Debug session failed', error);
  }
}

// Run the debug script
if (require.main === module) {
  debugQuotes().catch((error) => {
    Logger.error('Unhandled error in debug script', error);
    process.exit(1);
  });
}
