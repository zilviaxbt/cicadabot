"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const OptimizedArbitrageStrategy_1 = require("../src/strategies/OptimizedArbitrageStrategy");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
/**
 * Test script for optimized arbitrage strategy
 */
async function testOptimizedArbitrage() {
    try {
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        logger_1.Logger.info('🧪 Testing Optimized Arbitrage Strategy...');
        const bot = new CicadaBot_1.CicadaBot(config);
        await bot.initialize();
        logger_1.Logger.info('✅ Bot initialized successfully');
        // Optimized configuration - only use working fee tiers
        const arbitrageConfig = {
            minProfitThreshold: 0.1, // 0.1% minimum profit
            maxPositionSize: '10', // Small position size
            checkInterval: 10000, // Check every 10 seconds
            maxSlippage: 1.0 // 1% max slippage
        };
        const strategy = new OptimizedArbitrageStrategy_1.OptimizedArbitrageStrategy(bot, arbitrageConfig);
        logger_1.Logger.info('🚀 Starting optimized arbitrage test (will run for 60 seconds)...');
        logger_1.Logger.info('📊 Only using 0.05% and 1.00% fee tiers (skipping 0.30% due to low liquidity)');
        // Run for 60 seconds then stop
        const testPromise = strategy.start();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 60000));
        await Promise.race([testPromise, timeoutPromise]);
        strategy.stop();
        await bot.disconnect();
        logger_1.Logger.info('✅ Optimized arbitrage test completed');
    }
    catch (error) {
        logger_1.Logger.error('❌ Optimized arbitrage test failed', error);
    }
}
// Run the test
if (require.main === module) {
    testOptimizedArbitrage().catch((error) => {
        logger_1.Logger.error('Unhandled error in optimized arbitrage test', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-optimized-arbitrage.js.map