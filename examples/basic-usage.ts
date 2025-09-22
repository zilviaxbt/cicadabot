import { CicadaBot } from '../src/CicadaBot';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../src/constants/tokens';

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
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('Starting basic usage example...');

    // Initialize bot
    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('Bot initialized successfully');

    // 1. Get portfolio summary
    Logger.info('=== Portfolio Summary ===');
    const portfolio = await bot.getPortfolioSummary();
    Logger.info(`Total tokens: ${portfolio.totalTokens}`);
    Logger.info(`Active positions: ${portfolio.positions.length}`);
    
    portfolio.tokens.forEach(token => {
      Logger.info(`${token.symbol}: ${token.balance} (verified: ${token.verified})`);
    });

    // 2. Get a quote for GALA to USDC
    Logger.info('\n=== Getting Quote ===');
    const quote = await bot.getQuote({
      tokenIn: COMMON_TOKENS.GALA,
      tokenOut: COMMON_TOKENS.GUSDC,
      amountIn: '100',
      slippageTolerance: 0.5,
      feeTier: FEE_TIERS.LOW
    });
    
    Logger.info(`Quote: 100 GALA → ${quote.amountOut} USDC`);
    Logger.info(`Price impact: ${quote.priceImpact}%`);
    Logger.info(`Fee tier: ${quote.feeTier} (${quote.feeTier / 100}%)`);

    // 3. Get current price
    Logger.info('\n=== Current Price ===');
    const price = await bot.getCurrentPrice(COMMON_TOKENS.GALA, COMMON_TOKENS.GUSDC);
    Logger.info(`Current GALA/USDC price: ${price}`);

    // 4. Check token balances
    Logger.info('\n=== Token Balances ===');
    const galaBalance = await bot.getTokenBalance(COMMON_TOKENS.GALA);
    const usdcBalance = await bot.getTokenBalance(COMMON_TOKENS.GUSDC);
    
    Logger.info(`GALA balance: ${galaBalance}`);
    Logger.info(`USDC balance: ${usdcBalance}`);

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
    Logger.info('Example completed successfully');

  } catch (error) {
    Logger.error('Example failed', error);
    throw error;
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch((error) => {
    Logger.error('Unhandled error in example', error);
    process.exit(1);
  });
}
