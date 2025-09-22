import { CicadaBot } from '../src/CicadaBot';
import { FixedArbitrageStrategy, FixedArbitrageConfig } from '../src/strategies/FixedArbitrageStrategy';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';

/**
 * Test script for fixed arbitrage strategy
 */
async function testFixedArbitrage() {
  try {
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('🧪 Testing Fixed Arbitrage Strategy...');

    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('✅ Bot initialized successfully');

    // Fixed configuration - check both directions
    const arbitrageConfig: FixedArbitrageConfig = {
      minProfitThreshold: 0.01, // 0.01% minimum profit (very low to catch opportunities)
      maxPositionSize: '10', // Small position size
      checkInterval: 5000, // Check every 5 seconds
      maxSlippage: 1.0 // 1% max slippage
    };

    const strategy = new FixedArbitrageStrategy(bot, arbitrageConfig);
    
    Logger.info('🚀 Starting fixed arbitrage test (will run for 60 seconds)...');
    Logger.info('📊 Checking both GALA→USDC and USDC→GALA directions');
    Logger.info('🎯 Looking for the 40%+ USDC→GALA arbitrage opportunity!');
    
    // Run for 60 seconds then stop
    const testPromise = strategy.start();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 60000));
    
    await Promise.race([testPromise, timeoutPromise]);
    
    strategy.stop();
    await bot.disconnect();
    
    Logger.info('✅ Fixed arbitrage test completed');

  } catch (error) {
    Logger.error('❌ Fixed arbitrage test failed', error);
  }
}

// Run the test
if (require.main === module) {
  testFixedArbitrage().catch((error) => {
    Logger.error('Unhandled error in fixed arbitrage test', error);
    process.exit(1);
  });
}
