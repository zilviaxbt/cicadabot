import { CicadaBot } from '../src/CicadaBot';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../src/constants/tokens';

/**
 * Test swap functionality with your GALA balance
 */
async function swapTest() {
  try {
    // Load configuration
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('Starting swap test with 1997 GALA...');

    // Initialize bot
    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('✅ Bot initialized successfully');

    // Test 1: Get quote for different amounts
    const testAmounts = ['10', '50', '100', '500'];
    
    for (const amount of testAmounts) {
      Logger.info(`\n=== Testing quote for ${amount} GALA → USDC ===`);
      
      try {
        const quote = await bot.getQuote({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: amount,
          slippageTolerance: 0.5,
          feeTier: FEE_TIERS.LOW
        });
        
        Logger.info(`✅ Quote for ${amount} GALA:`, {
          amountIn: quote.amountIn,
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact,
          feeTier: quote.feeTier,
          currentPrice: quote.currentPrice,
          newPrice: quote.newPrice
        });
        
        // Calculate effective price
        const effectivePrice = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);
        Logger.info(`💰 Effective price: 1 GALA = ${effectivePrice.toFixed(6)} USDC`);
        
      } catch (error) {
        Logger.warn(`⚠️ Quote failed for ${amount} GALA:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Test 2: Get current market price
    Logger.info('\n=== Current Market Price ===');
    try {
      const price = await bot.getCurrentPrice(COMMON_TOKENS.GALA, COMMON_TOKENS.GUSDC);
      Logger.info(`💰 Current GALA/USDC price: ${price}`);
    } catch (error) {
      Logger.warn('⚠️ Price fetch failed:', error instanceof Error ? error.message : String(error));
    }

    // Test 3: Test different fee tiers
    Logger.info('\n=== Testing Different Fee Tiers ===');
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
          amountIn: '100',
          slippageTolerance: 0.5,
          feeTier: tier
        });
        
        Logger.info(`✅ ${name} fee tier:`, {
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact
        });
        
      } catch (error) {
        Logger.warn(`⚠️ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Test 4: Example of how to execute a swap (commented out for safety)
    Logger.info('\n=== Swap Execution Example (Commented Out) ===');
    Logger.info('To execute a swap, uncomment the code below:');
    Logger.info(`
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
    Logger.info('\n✅ Swap test completed successfully');

  } catch (error) {
    Logger.error('❌ Swap test failed', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  swapTest().catch((error) => {
    Logger.error('Unhandled error in swap test', error);
    process.exit(1);
  });
}
