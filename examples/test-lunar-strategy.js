#!/usr/bin/env ts-node
"use strict";
/**
 * Test Lunar Phase Strategy
 *
 * This script tests the lunar phase strategy without executing actual trades.
 * It demonstrates how the strategy calculates lunar phases and generates signals.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const LunarPhaseStrategy_1 = require("../src/strategies/LunarPhaseStrategy");
const logger_1 = require("../src/utils/logger");
// Mock bot for testing
class MockBot {
    addArbitrageResult(result) {
        logger_1.Logger.info('📊 Mock bot received result:', result);
    }
}
async function testLunarStrategy() {
    try {
        logger_1.Logger.info('🌙 Testing Lunar Phase Strategy');
        // Create mock bot
        const mockBot = new MockBot();
        // Test configuration
        const config = {
            minTradeAmount: '10',
            maxTradeAmount: '50',
            checkInterval: 300000,
            maxSlippage: 0.5,
            enabledTokens: ['GALA', 'USDC'],
            strategy: 'both',
            phaseThreshold: 2,
            riskManagement: {
                stopLossPercentage: 5,
                takeProfitPercentage: 10,
                maxPositionSize: 20
            }
        };
        // Create strategy instance
        const strategy = new LunarPhaseStrategy_1.LunarPhaseStrategy(mockBot, config);
        // Test lunar phase calculation
        logger_1.Logger.info('🔍 Testing lunar phase calculations...');
        const currentPhase = strategy.getCurrentLunarPhase();
        logger_1.Logger.info('🌙 Current Lunar Phase:', {
            phase: currentPhase.phaseName,
            phaseValue: currentPhase.phase.toFixed(3),
            daysToNext: currentPhase.daysToNextPhase.toFixed(1),
            isNewMoon: currentPhase.isNewMoon,
            isFullMoon: currentPhase.isFullMoon,
            isWaxing: currentPhase.isWaxing,
            isWaning: currentPhase.isWaning
        });
        // Test different dates
        const testDates = [
            new Date('2024-01-01'),
            new Date('2024-02-01'),
            new Date('2024-03-01'),
            new Date('2024-04-01'),
            new Date('2024-05-01')
        ];
        logger_1.Logger.info('📅 Testing lunar phases for different dates:');
        for (const date of testDates) {
            const phaseInfo = strategy.getLunarPhaseInfo(date);
            logger_1.Logger.info(`📆 ${date.toISOString().split('T')[0]}:`, {
                phase: phaseInfo.phaseName,
                phaseValue: phaseInfo.phase.toFixed(3),
                isNewMoon: phaseInfo.isNewMoon,
                isFullMoon: phaseInfo.isFullMoon
            });
        }
        // Test signal generation
        logger_1.Logger.info('🎯 Testing signal generation...');
        const signal = strategy.generateTradeSignal(currentPhase);
        logger_1.Logger.info('📊 Generated Signal:', {
            action: signal.action,
            confidence: (signal.confidence * 100).toFixed(1) + '%',
            reason: signal.reason,
            recommendedAmount: signal.recommendedAmount
        });
        // Test configuration update
        logger_1.Logger.info('⚙️ Testing configuration update...');
        strategy.updateConfig({
            minTradeAmount: '20',
            maxTradeAmount: '100'
        });
        logger_1.Logger.info('✅ Lunar Phase Strategy test completed successfully!');
    }
    catch (error) {
        logger_1.Logger.error('❌ Test failed:', error);
        process.exit(1);
    }
}
// Run the test
if (require.main === module) {
    testLunarStrategy().catch(error => {
        logger_1.Logger.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-lunar-strategy.js.map