import { CicadaBot } from '../src/CicadaBot';
import { BotConfig } from '../src/types';
import { COMMON_TOKENS, FEE_TIERS } from '../src/constants/tokens';
import { Logger } from '../src/utils/logger';

// Example configuration for the Prime Interval Strategy
const botConfig: BotConfig = {
  privateKey: process.env.PRIVATE_KEY || '',
  walletAddress: process.env.WALLET_ADDRESS || '',
  gatewayBaseUrl: process.env.GATEWAY_BASE_URL,
  transactionWaitTimeoutMs: 30000,
  logLevel: 'info'
};

async function runPrimeIntervalStrategy() {
  try {
    Logger.info('🚀 Starting Prime Cicada Strategy Example');

    // Initialize the bot
    const bot = new CicadaBot(botConfig);
    await bot.initialize();

    if (!bot.isReady()) {
      throw new Error('Bot is not ready for trading');
    }

    Logger.info('✅ Bot initialized successfully');

    // Get initial portfolio
    const portfolio = await bot.getPortfolioSummary();
    Logger.info('📊 Initial Portfolio:', {
      totalTokens: portfolio.totalTokens,
      tokens: portfolio.tokens.map(t => `${t.symbol}: ${t.balance}`)
    });

    // Start the Prime Interval Strategy with custom configuration
    const strategyConfig = {
      tokenA: COMMON_TOKENS.GUSDC, // USDC
      tokenB: COMMON_TOKENS.GALA,  // GALA
      slippageTolerance: 0.5,      // 0.5% slippage
      swapPercentage: 33,          // Swap 33% of balance each time
      feeTier: FEE_TIERS.MEDIUM,   // 0.30% fee tier
      enabled: true
    };

    Logger.info('🎯 Starting Prime Cicada Strategy with config:', strategyConfig);

    const strategyResult = await bot.startArbitrageStrategy('prime', strategyConfig);
    Logger.info('✅ Strategy started:', strategyResult);

    // Monitor the strategy for a while
    Logger.info('⏰ Monitoring strategy for 5 minutes...');
    
    // Set up periodic status checks
    const statusInterval = setInterval(async () => {
      const status = bot.getArbitrageStatus();
      const strategy = bot.getCurrentStrategy();
      
      if (strategy && typeof strategy.getStatus === 'function') {
        const strategyStatus = strategy.getStatus();
        Logger.info('📈 Strategy Status:', {
          isRunning: status.isRunning,
          currentInterval: strategyStatus.currentInterval,
          primeNumber: strategyStatus.primeNumber,
          nextSwapTime: strategyStatus.nextSwapTime.toISOString(),
          action: strategyStatus.isBuyingTokenB ? 'BUY' : 'SELL',
          tokenA: strategyStatus.tokenA,
          tokenB: strategyStatus.tokenB
        });
      }
    }, 60000); // Check every minute

    // Run for 5 minutes then stop
    setTimeout(async () => {
      clearInterval(statusInterval);
      
      Logger.info('🛑 Stopping strategy after 5 minutes...');
      await bot.stopArbitrageStrategy();
      
      // Get final portfolio
      const finalPortfolio = await bot.getPortfolioSummary();
      Logger.info('📊 Final Portfolio:', {
        totalTokens: finalPortfolio.totalTokens,
        tokens: finalPortfolio.tokens.map(t => `${t.symbol}: ${t.balance}`)
      });

      // Get transaction history
      const transactions = bot.getTransactionHistory(10);
      Logger.info('📋 Recent Transactions:', transactions.map(tx => ({
        type: tx.type,
        tokenIn: tx.tokenIn,
        tokenOut: tx.tokenOut,
        amountIn: tx.amountIn,
        amountOut: tx.amountOut,
        status: tx.status,
        timestamp: tx.timestamp
      })));

      await bot.disconnect();
      Logger.info('✅ Example completed successfully');
      process.exit(0);
    }, 5 * 60 * 1000); // 5 minutes

  } catch (error) {
    Logger.error('❌ Example failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the example
if (require.main === module) {
  runPrimeIntervalStrategy().catch(error => {
    Logger.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { runPrimeIntervalStrategy };
