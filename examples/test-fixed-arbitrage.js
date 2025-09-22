"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const FixedArbitrageStrategy_1 = require("../src/strategies/FixedArbitrageStrategy");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
/**
 * Test script for fixed arbitrage strategy
 */
async function testFixedArbitrage() {
    try {
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('🧪 Testing Fixed Arbitrage Strategy...');
        const bot = new CicadaBot_1.CicadaBot(config);
        await bot.initialize();
        logger_1.Logger.info('✅ Bot initialized successfully');
        // Fixed configuration - check both directions
        const arbitrageConfig = {
            minProfitThreshold: 0.01, // 0.01% minimum profit (very low to catch opportunities)
            maxPositionSize: '10', // Small position size
            checkInterval: 5000, // Check every 5 seconds
            maxSlippage: 1.0 // 1% max slippage
        };
        const strategy = new FixedArbitrageStrategy_1.FixedArbitrageStrategy(bot, arbitrageConfig);
        logger_1.Logger.info('🚀 Starting fixed arbitrage test (will run for 60 seconds)...');
        logger_1.Logger.info('📊 Checking both GALA→USDC and USDC→GALA directions');
        logger_1.Logger.info('🎯 Looking for the 40%+ USDC→GALA arbitrage opportunity!');
        // Run for 60 seconds then stop
        const testPromise = strategy.start();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 60000));
        await Promise.race([testPromise, timeoutPromise]);
        strategy.stop();
        await bot.disconnect();
        logger_1.Logger.info('✅ Fixed arbitrage test completed');
    }
    catch (error) {
        logger_1.Logger.error('❌ Fixed arbitrage test failed', error);
    }
}
// Run the test
if (require.main === module) {
    testFixedArbitrage().catch((error) => {
        logger_1.Logger.error('Unhandled error in fixed arbitrage test', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-fixed-arbitrage.js.map