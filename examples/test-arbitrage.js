"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const SimpleArbitrageStrategy_1 = require("../src/strategies/SimpleArbitrageStrategy");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
/**
 * Test script for simple arbitrage strategy
 */
async function testArbitrage() {
    try {
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('🧪 Testing Simple Arbitrage Strategy...');
        const bot = new CicadaBot_1.CicadaBot(config);
        await bot.initialize();
        logger_1.Logger.info('✅ Bot initialized successfully');
        // Test configuration
        const arbitrageConfig = {
            minProfitThreshold: 0.01, // Very low threshold for testing
            maxPositionSize: '10', // Small position size
            checkInterval: 5000, // Check every 5 seconds
            maxSlippage: 1.0 // 1% max slippage
        };
        const strategy = new SimpleArbitrageStrategy_1.SimpleArbitrageStrategy(bot, arbitrageConfig);
        logger_1.Logger.info('🚀 Starting arbitrage test (will run for 30 seconds)...');
        // Run for 30 seconds then stop
        const testPromise = strategy.start();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 30000));
        await Promise.race([testPromise, timeoutPromise]);
        strategy.stop();
        await bot.disconnect();
        logger_1.Logger.info('✅ Arbitrage test completed');
    }
    catch (error) {
        logger_1.Logger.error('❌ Arbitrage test failed', error);
    }
}
// Run the test
if (require.main === module) {
    testArbitrage().catch((error) => {
        logger_1.Logger.error('Unhandled error in arbitrage test', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-arbitrage.js.map