import { CicadaBot } from '../src/CicadaBot';
import { SimpleArbitrageStrategy, SimpleArbitrageConfig } from '../src/strategies/SimpleArbitrageStrategy';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';

/**
 * Test script for simple arbitrage strategy
 */
async function testArbitrage() {
  try {
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('🧪 Testing Simple Arbitrage Strategy...');

    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('✅ Bot initialized successfully');

    // Test configuration
    const arbitrageConfig: SimpleArbitrageConfig = {
      minProfitThreshold: 0.01, // Very low threshold for testing
      maxPositionSize: '10', // Small position size
      checkInterval: 5000, // Check every 5 seconds
      maxSlippage: 1.0 // 1% max slippage
    };

    const strategy = new SimpleArbitrageStrategy(bot, arbitrageConfig);
    
    Logger.info('🚀 Starting arbitrage test (will run for 30 seconds)...');
    
    // Run for 30 seconds then stop
    const testPromise = strategy.start();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 30000));
    
    await Promise.race([testPromise, timeoutPromise]);
    
    strategy.stop();
    await bot.disconnect();
    
    Logger.info('✅ Arbitrage test completed');

  } catch (error) {
    Logger.error('❌ Arbitrage test failed', error);
  }
}

// Run the test
if (require.main === module) {
  testArbitrage().catch((error) => {
    Logger.error('Unhandled error in arbitrage test', error);
    process.exit(1);
  });
}
