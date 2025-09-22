#!/usr/bin/env ts-node

/**
 * Test Lunar Phase Strategy
 * 
 * This script tests the lunar phase strategy without executing actual trades.
 * It demonstrates how the strategy calculates lunar phases and generates signals.
 */

import { LunarPhaseStrategy, LunarPhaseConfig } from '../src/strategies/LunarPhaseStrategy';
import { Logger } from '../src/utils/logger';

// Mock bot for testing
class MockBot {
  public addArbitrageResult(result: any) {
    Logger.info('📊 Mock bot received result:', result);
  }
}

async function testLunarStrategy() {
  try {
    Logger.info('🌙 Testing Lunar Phase Strategy');

    // Create mock bot
    const mockBot = new MockBot() as any;

    // Test configuration
    const config: LunarPhaseConfig = {
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
    const strategy = new LunarPhaseStrategy(mockBot, config);

    // Test lunar phase calculation
    Logger.info('🔍 Testing lunar phase calculations...');
    
    const currentPhase = strategy.getCurrentLunarPhase();
    Logger.info('🌙 Current Lunar Phase:', {
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

    Logger.info('📅 Testing lunar phases for different dates:');
    for (const date of testDates) {
      const phaseInfo = (strategy as any).getLunarPhaseInfo(date);
      Logger.info(`📆 ${date.toISOString().split('T')[0]}:`, {
        phase: phaseInfo.phaseName,
        phaseValue: phaseInfo.phase.toFixed(3),
        isNewMoon: phaseInfo.isNewMoon,
        isFullMoon: phaseInfo.isFullMoon
      });
    }

    // Test signal generation
    Logger.info('🎯 Testing signal generation...');
    const signal = (strategy as any).generateTradeSignal(currentPhase);
    Logger.info('📊 Generated Signal:', {
      action: signal.action,
      confidence: (signal.confidence * 100).toFixed(1) + '%',
      reason: signal.reason,
      recommendedAmount: signal.recommendedAmount
    });

    // Test configuration update
    Logger.info('⚙️ Testing configuration update...');
    strategy.updateConfig({
      minTradeAmount: '20',
      maxTradeAmount: '100'
    });

    Logger.info('✅ Lunar Phase Strategy test completed successfully!');

  } catch (error) {
    Logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testLunarStrategy().catch(error => {
    Logger.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}
