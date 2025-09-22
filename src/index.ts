import { CicadaBot } from './CicadaBot';
import { loadConfig, validateConfig } from './utils/config';
import { Logger } from './utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from './constants/tokens';

async function main() {
  try {
    // Load and validate configuration
    const config = loadConfig();
    validateConfig(config);
    
    // Initialize logger
    const logger = Logger.getInstance(config.logLevel);
    logger.info('Starting Cicada Bot...');

    // Create bot instance
    const bot = new CicadaBot(config);
    
    // Initialize bot
    await bot.initialize();
    
    logger.info('Bot initialized successfully', bot.getStatus());

    // Example: Get portfolio summary
    logger.info('Fetching portfolio summary...');
    const portfolio = await bot.getPortfolioSummary();
    logger.info('Portfolio Summary:', {
      totalTokens: portfolio.totalTokens,
      activePositions: portfolio.positions.length
    });

    // Example: Get quote for GALA to USDC swap
    logger.info('Getting quote for GALA to USDC swap...');
    const quote = await bot.getQuote({
      tokenIn: COMMON_TOKENS.GALA,
      tokenOut: COMMON_TOKENS.GUSDC,
      amountIn: '100',
      slippageTolerance: 0.5,
      feeTier: FEE_TIERS.LOW
    });
    
    logger.info('Quote received:', {
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      priceImpact: quote.priceImpact,
      feeTier: quote.feeTier
    });

    // Example: Get current price
    const currentPrice = await bot.getCurrentPrice(COMMON_TOKENS.GALA, COMMON_TOKENS.GUSDC);
    logger.info(`Current GALA/USDC price: ${currentPrice}`);

    // Example: Get token balance
    const galaBalance = await bot.getTokenBalance(COMMON_TOKENS.GALA);
    logger.info(`GALA balance: ${galaBalance}`);

    // Keep the bot running
    logger.info('Bot is running. Press Ctrl+C to exit.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down bot...');
      await bot.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down bot...');
      await bot.disconnect();
      process.exit(0);
    });

  } catch (error) {
    Logger.error('Failed to start bot', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    Logger.error('Unhandled error in main', error);
    process.exit(1);
  });
}

export { CicadaBot };
export * from './types';
export * from './constants/tokens';
