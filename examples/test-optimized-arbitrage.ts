import { CicadaBot } from '../src/CicadaBot';
import { OptimizedArbitrageStrategy, OptimizedArbitrageConfig } from '../src/strategies/OptimizedArbitrageStrategy';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';

/**
 * Test script for optimized arbitrage strategy
 */
async function testOptimizedArbitrage() {
  try {
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('🧪 Testing Optimized Arbitrage Strategy...');

    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('✅ Bot initialized successfully');

    // Optimized configuration - only use working fee tiers
    const arbitrageConfig: OptimizedArbitrageConfig = {
      minProfitThreshold: 0.1, // 0.1% minimum profit
      maxPositionSize: '10', // Small position size
      checkInterval: 10000, // Check every 10 seconds
      maxSlippage: 1.0 // 1% max slippage
    };

    const strategy = new OptimizedArbitrageStrategy(bot, arbitrageConfig);
    
    Logger.info('🚀 Starting optimized arbitrage test (will run for 60 seconds)...');
    Logger.info('📊 Only using 0.05% and 1.00% fee tiers (skipping 0.30% due to low liquidity)');
    
    // Run for 60 seconds then stop
    const testPromise = strategy.start();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 60000));
    
    await Promise.race([testPromise, timeoutPromise]);
    
    strategy.stop();
    await bot.disconnect();
    
    Logger.info('✅ Optimized arbitrage test completed');

  } catch (error) {
    Logger.error('❌ Optimized arbitrage test failed', error);
  }
}

// Run the test
if (require.main === module) {
  testOptimizedArbitrage().catch((error) => {
    Logger.error('Unhandled error in optimized arbitrage test', error);
    process.exit(1);
  });
}
