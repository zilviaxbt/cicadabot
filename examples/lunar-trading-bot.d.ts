#!/usr/bin/env ts-node
/**
 * Lunar Phase Trading Bot Example
 *
 * This example demonstrates how to use the Lunar Phase Strategy
 * to trade based on moon phases. The strategy follows the hypothesis
 * that lunar cycles may influence market sentiment and price movements.
 *
 * Trading Rules:
 * - New Moon: Buy signal (bullish sentiment)
 * - Full Moon: Sell signal (bearish sentiment)
 * - Waxing Moon: Gradual buying pressure
 * - Waning Moon: Gradual selling pressure
 *
 * Risk Management:
 * - Stop loss: 5% below entry price
 * - Take profit: 10% above entry price
 * - Position size: Based on signal confidence
 * - Time limit: Close positions after 7 days
 */
export declare const lunarStrategyExamples: {
    conservative: {
        minTradeAmount: string;
        maxTradeAmount: string;
        checkInterval: number;
        maxSlippage: number;
        enabledTokens: string[];
        strategy: string;
        phaseThreshold: number;
        riskManagement: {
            stopLossPercentage: number;
            takeProfitPercentage: number;
            maxPositionSize: number;
        };
    };
    aggressive: {
        minTradeAmount: string;
        maxTradeAmount: string;
        checkInterval: number;
        maxSlippage: number;
        enabledTokens: string[];
        strategy: string;
        phaseThreshold: number;
        riskManagement: {
            stopLossPercentage: number;
            takeProfitPercentage: number;
            maxPositionSize: number;
        };
    };
    newMoonOnly: {
        minTradeAmount: string;
        maxTradeAmount: string;
        checkInterval: number;
        maxSlippage: number;
        enabledTokens: string[];
        strategy: string;
        phaseThreshold: number;
        riskManagement: {
            stopLossPercentage: number;
            takeProfitPercentage: number;
            maxPositionSize: number;
        };
    };
    fullMoonOnly: {
        minTradeAmount: string;
        maxTradeAmount: string;
        checkInterval: number;
        maxSlippage: number;
        enabledTokens: string[];
        strategy: string;
        phaseThreshold: number;
        riskManagement: {
            stopLossPercentage: number;
            takeProfitPercentage: number;
            maxPositionSize: number;
        };
    };
};
//# sourceMappingURL=lunar-trading-bot.d.ts.map