import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';
import { COMMON_TOKENS } from '../constants/tokens';
// Simple lunar phase calculation without external dependencies
function getMoonPhase(date: Date): number {
  // Julian day calculation
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  // Known new moon: January 11, 2024 (Julian day 2460326.5)
  const knownNewMoon = 2460326.5;
  const lunarCycle = 29.530588853; // Average lunar cycle in days
  
  // Calculate days since known new moon
  const daysSinceNewMoon = jd - knownNewMoon;
  
  // Calculate current phase (0 = new moon, 0.5 = full moon, 1 = new moon again)
  const phase = (daysSinceNewMoon % lunarCycle) / lunarCycle;
  
  return phase;
}

function getMoonPhaseName(date: Date): string {
  const phase = getMoonPhase(date);
  
  if (phase < 0.0625) return 'New Moon';
  if (phase < 0.1875) return 'Waxing Crescent';
  if (phase < 0.3125) return 'First Quarter';
  if (phase < 0.4375) return 'Waxing Gibbous';
  if (phase < 0.5625) return 'Full Moon';
  if (phase < 0.6875) return 'Waning Gibbous';
  if (phase < 0.8125) return 'Last Quarter';
  if (phase < 0.9375) return 'Waning Crescent';
  return 'New Moon';
}

export interface LunarPhaseConfig {
  minTradeAmount: string; // Minimum amount to trade
  maxTradeAmount: string; // Maximum amount to trade
  checkInterval: number; // How often to check lunar phase (ms)
  maxSlippage: number; // Maximum slippage tolerance
  enabledTokens: string[]; // Which tokens to trade
  strategy: 'new-moon-buy' | 'full-moon-sell' | 'both'; // Trading strategy
  phaseThreshold: number; // Days before/after phase to trigger trade
  riskManagement: {
    stopLossPercentage: number; // Stop loss percentage
    takeProfitPercentage: number; // Take profit percentage
    maxPositionSize: number; // Maximum position size as percentage of balance
  };
}

export interface LunarPhaseInfo {
  phase: number; // 0-1, where 0 is new moon, 0.5 is full moon
  phaseName: string;
  daysToNextPhase: number;
  isNewMoon: boolean;
  isFullMoon: boolean;
  isWaxing: boolean; // Moon is getting brighter
  isWaning: boolean; // Moon is getting darker
}

export interface LunarTradeSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-1 confidence level
  reason: string;
  phaseInfo: LunarPhaseInfo;
  recommendedAmount: string;
}

export class LunarPhaseStrategy {
  private bot: CicadaBot;
  private config: LunarPhaseConfig;
  private isRunning: boolean = false;
  private currentPosition: {
    tokenIn: string;
    tokenOut: string;
    amount: string;
    entryPrice: string;
    entryDate: Date;
    stopLoss: string;
    takeProfit: string;
  } | null = null;
  private lastTradeDate: Date | null = null;

  constructor(bot: CicadaBot, config: LunarPhaseConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * Start the lunar phase monitoring
   */
  async start(): Promise<void> {
    this.isRunning = true;
    Logger.info('🌙 Starting Lunar Phase Strategy', {
      strategy: this.config.strategy,
      minTradeAmount: this.config.minTradeAmount,
      maxTradeAmount: this.config.maxTradeAmount,
      checkInterval: this.config.checkInterval
    });

    while (this.isRunning) {
      try {
        await this.analyzeLunarPhase();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        Logger.error('❌ Lunar phase analysis error:', error instanceof Error ? error.message : String(error));
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Stop the lunar phase monitoring
   */
  stop(): void {
    this.isRunning = false;
    Logger.info('🛑 Lunar Phase Strategy stopped');
  }

  /**
   * Analyze current lunar phase and generate trading signals
   */
  private async analyzeLunarPhase(): Promise<void> {
    const now = new Date();
    const phaseInfo = this.getLunarPhaseInfo(now);
    const signal = this.generateTradeSignal(phaseInfo);

    Logger.info('🌙 Lunar Phase Analysis', {
      phase: phaseInfo.phaseName,
      phaseValue: phaseInfo.phase.toFixed(3),
      daysToNext: phaseInfo.daysToNextPhase.toFixed(1),
      signal: signal.action,
      confidence: (signal.confidence * 100).toFixed(1) + '%',
      reason: signal.reason
    });

    // Add lunar phase info to bot for web interface display
    this.bot.addArbitrageResult({
      type: 'Lunar Phase Analysis',
      amount: '0',
      profitPercentage: 0,
      expectedProfit: '0',
      tokenIn: 'LUNAR',
      tokenOut: 'PHASE',
      lunarPhase: phaseInfo.phaseName,
      signal: signal.action,
      confidence: signal.confidence
    });

    // Execute trade if signal is strong enough
    if (signal.confidence > 0.7 && signal.action !== 'hold') {
      await this.executeLunarTrade(signal);
    }

    // Check existing position for stop loss or take profit
    if (this.currentPosition) {
      await this.manageExistingPosition();
    }
  }

  /**
   * Get detailed lunar phase information
   */
  private getLunarPhaseInfo(date: Date): LunarPhaseInfo {
    const phase = getMoonPhase(date);
    const phaseName = getMoonPhaseName(date);
    
    // Calculate days to next major phase (new moon or full moon)
    const daysToNextPhase = this.calculateDaysToNextPhase(date, phase);
    
    // Determine if we're in waxing or waning phase
    const isWaxing = phase > 0 && phase < 0.5;
    const isWaning = phase > 0.5 && phase < 1;
    
    // Check if we're close to new moon (0) or full moon (0.5)
    const isNewMoon = phase < 0.1 || phase > 0.9;
    const isFullMoon = phase > 0.4 && phase < 0.6;

    return {
      phase,
      phaseName,
      daysToNextPhase,
      isNewMoon,
      isFullMoon,
      isWaxing,
      isWaning
    };
  }

  /**
   * Calculate days to next major lunar phase
   */
  private calculateDaysToNextPhase(_date: Date, currentPhase: number): number {
    const lunarCycle = 29.530588853; // Average lunar cycle in days
    
    let targetPhase: number;
    if (currentPhase < 0.5) {
      targetPhase = 0.5; // Next full moon
    } else {
      targetPhase = 1.0; // Next new moon (wraps to 0)
    }
    
    const phaseDifference = targetPhase - currentPhase;
    if (phaseDifference < 0) {
      return (phaseDifference + 1) * lunarCycle;
    }
    
    return phaseDifference * lunarCycle;
  }

  /**
   * Generate trading signal based on lunar phase
   */
  private generateTradeSignal(phaseInfo: LunarPhaseInfo): LunarTradeSignal {
    const now = new Date();
    const daysSinceLastTrade = this.lastTradeDate 
      ? (now.getTime() - this.lastTradeDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    // Don't trade too frequently
    if (daysSinceLastTrade < 1) {
      return {
        action: 'hold',
        confidence: 0,
        reason: 'Too soon since last trade',
        phaseInfo,
        recommendedAmount: '0'
      };
    }

    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0;
    let reason = '';

    // New Moon Strategy: Buy during new moon
    if (this.config.strategy === 'new-moon-buy' || this.config.strategy === 'both') {
      if (phaseInfo.isNewMoon && phaseInfo.daysToNextPhase < this.config.phaseThreshold) {
        action = 'buy';
        confidence = 0.8;
        reason = 'New moon detected - bullish signal';
      }
    }

    // Full Moon Strategy: Sell during full moon
    if (this.config.strategy === 'full-moon-sell' || this.config.strategy === 'both') {
      if (phaseInfo.isFullMoon && phaseInfo.daysToNextPhase < this.config.phaseThreshold) {
        action = 'sell';
        confidence = 0.8;
        reason = 'Full moon detected - bearish signal';
      }
    }

    // Waxing Moon: Gradual buying pressure
    if (phaseInfo.isWaxing && phaseInfo.phase > 0.1 && phaseInfo.phase < 0.4) {
      if (action === 'hold') {
        action = 'buy';
        confidence = 0.6;
        reason = 'Waxing moon - moderate bullish signal';
      }
    }

    // Waning Moon: Gradual selling pressure
    if (phaseInfo.isWaning && phaseInfo.phase > 0.6 && phaseInfo.phase < 0.9) {
      if (action === 'hold') {
        action = 'sell';
        confidence = 0.6;
        reason = 'Waning moon - moderate bearish signal';
      }
    }

    // Calculate recommended trade amount
    const recommendedAmount = this.calculateTradeAmount(action, confidence);

    return {
      action,
      confidence,
      reason,
      phaseInfo,
      recommendedAmount
    };
  }

  /**
   * Calculate appropriate trade amount based on signal strength
   */
  private calculateTradeAmount(_action: string, confidence: number): string {
    const minAmount = parseFloat(this.config.minTradeAmount);
    const maxAmount = parseFloat(this.config.maxTradeAmount);
    
    // Scale amount based on confidence
    const amountRange = maxAmount - minAmount;
    const scaledAmount = minAmount + (amountRange * confidence);
    
    return scaledAmount.toFixed(2);
  }

  /**
   * Execute trade based on lunar signal
   */
  private async executeLunarTrade(signal: LunarTradeSignal): Promise<void> {
    if (signal.action === 'hold') {
      return;
    }

    const tokenPair = this.getTokenPair();
    if (!tokenPair) {
      Logger.warn('No suitable token pair found for lunar trading');
      return;
    }

    try {
      if (signal.action === 'buy') {
        await this.executeBuyTrade(tokenPair, signal);
      } else if (signal.action === 'sell') {
        await this.executeSellTrade(tokenPair, signal);
      }
    } catch (error) {
      Logger.error('❌ Lunar trade execution failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Execute buy trade
   */
  private async executeBuyTrade(tokenPair: { tokenIn: string; tokenOut: string }, signal: LunarTradeSignal): Promise<void> {
    Logger.info('🌙 Executing lunar buy trade:', {
      pair: `${tokenPair.tokenIn}/${tokenPair.tokenOut}`,
      amount: signal.recommendedAmount,
      reason: signal.reason,
      confidence: (signal.confidence * 100).toFixed(1) + '%'
    });

    const result = await this.bot.executeSwap({
      tokenIn: tokenPair.tokenIn,
      tokenOut: tokenPair.tokenOut,
      amountIn: signal.recommendedAmount,
      slippageTolerance: this.config.maxSlippage
    });

    if (result.success) {
      // Set up position tracking
      this.currentPosition = {
        tokenIn: tokenPair.tokenIn,
        tokenOut: tokenPair.tokenOut,
        amount: signal.recommendedAmount,
        entryPrice: result.amountOut,
        entryDate: new Date(),
        stopLoss: this.calculateStopLoss(result.amountOut, 'buy'),
        takeProfit: this.calculateTakeProfit(result.amountOut, 'buy')
      };

      this.lastTradeDate = new Date();

      Logger.info('✅ Lunar buy trade completed:', {
        transactionHash: result.transactionHash,
        amountOut: result.amountOut,
        stopLoss: this.currentPosition.stopLoss,
        takeProfit: this.currentPosition.takeProfit
      });

      // Add trade result to bot for web interface display
      this.bot.addArbitrageResult({
        type: 'Lunar Buy Trade',
        amount: signal.recommendedAmount,
        profitPercentage: 0,
        expectedProfit: '0',
        tokenIn: tokenPair.tokenIn,
        tokenOut: tokenPair.tokenOut,
        lunarPhase: signal.phaseInfo.phaseName,
        confidence: signal.confidence
      });
    } else {
      Logger.error('❌ Lunar buy trade failed:', result.error);
    }
  }

  /**
   * Execute sell trade
   */
  private async executeSellTrade(tokenPair: { tokenIn: string; tokenOut: string }, signal: LunarTradeSignal): Promise<void> {
    Logger.info('🌙 Executing lunar sell trade:', {
      pair: `${tokenPair.tokenIn}/${tokenPair.tokenOut}`,
      amount: signal.recommendedAmount,
      reason: signal.reason,
      confidence: (signal.confidence * 100).toFixed(1) + '%'
    });

    const result = await this.bot.executeSwap({
      tokenIn: tokenPair.tokenIn,
      tokenOut: tokenPair.tokenOut,
      amountIn: signal.recommendedAmount,
      slippageTolerance: this.config.maxSlippage
    });

    if (result.success) {
      this.lastTradeDate = new Date();

      Logger.info('✅ Lunar sell trade completed:', {
        transactionHash: result.transactionHash,
        amountOut: result.amountOut
      });

      // Add trade result to bot for web interface display
      this.bot.addArbitrageResult({
        type: 'Lunar Sell Trade',
        amount: signal.recommendedAmount,
        profitPercentage: 0,
        expectedProfit: '0',
        tokenIn: tokenPair.tokenIn,
        tokenOut: tokenPair.tokenOut,
        lunarPhase: signal.phaseInfo.phaseName,
        confidence: signal.confidence
      });
    } else {
      Logger.error('❌ Lunar sell trade failed:', result.error);
    }
  }

  /**
   * Manage existing position (stop loss, take profit)
   */
  private async manageExistingPosition(): Promise<void> {
    if (!this.currentPosition) {
      return;
    }

    try {
      // Get current price
      const currentPrice = await this.bot.getCurrentPrice(
        this.currentPosition.tokenOut,
        this.currentPosition.tokenIn
      );

      const currentPriceNum = parseFloat(currentPrice);
      const stopLoss = parseFloat(this.currentPosition.stopLoss);
      const takeProfit = parseFloat(this.currentPosition.takeProfit);

      // Check stop loss
      if (currentPriceNum <= stopLoss) {
        Logger.info('🛑 Stop loss triggered for lunar position');
        await this.closePosition('stop-loss');
        return;
      }

      // Check take profit
      if (currentPriceNum >= takeProfit) {
        Logger.info('🎯 Take profit triggered for lunar position');
        await this.closePosition('take-profit');
        return;
      }

      // Check if position is too old (close after 7 days)
      const daysSinceEntry = (Date.now() - this.currentPosition.entryDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceEntry > 7) {
        Logger.info('⏰ Closing lunar position due to time limit');
        await this.closePosition('time-limit');
        return;
      }

    } catch (error) {
      Logger.error('❌ Error managing lunar position:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Close current position
   */
  private async closePosition(reason: string): Promise<void> {
    if (!this.currentPosition) {
      return;
    }

    try {
      const result = await this.bot.executeSwap({
        tokenIn: this.currentPosition.tokenOut,
        tokenOut: this.currentPosition.tokenIn,
        amountIn: this.currentPosition.amount,
        slippageTolerance: this.config.maxSlippage
      });

      if (result.success) {
        const profit = parseFloat(result.amountOut) - parseFloat(this.currentPosition.amount);
        const profitPercentage = (profit / parseFloat(this.currentPosition.amount)) * 100;

        Logger.info('✅ Lunar position closed:', {
          reason,
          transactionHash: result.transactionHash,
          profit: profit.toFixed(6),
          profitPercentage: profitPercentage.toFixed(2) + '%'
        });

        // Add position close result to bot for web interface display
        this.bot.addArbitrageResult({
          type: 'Lunar Position Closed',
          amount: this.currentPosition.amount,
          profitPercentage: profitPercentage,
          expectedProfit: profit.toFixed(6),
          tokenIn: this.currentPosition.tokenIn,
          tokenOut: this.currentPosition.tokenOut,
          reason: reason
        });

        this.currentPosition = null;
      } else {
        Logger.error('❌ Failed to close lunar position:', result.error);
      }
    } catch (error) {
      Logger.error('❌ Error closing lunar position:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Calculate stop loss price
   */
  private calculateStopLoss(entryPrice: string, action: 'buy' | 'sell'): string {
    const price = parseFloat(entryPrice);
    const stopLossPercentage = this.config.riskManagement.stopLossPercentage / 100;
    
    if (action === 'buy') {
      return (price * (1 - stopLossPercentage)).toFixed(6);
    } else {
      return (price * (1 + stopLossPercentage)).toFixed(6);
    }
  }

  /**
   * Calculate take profit price
   */
  private calculateTakeProfit(entryPrice: string, action: 'buy' | 'sell'): string {
    const price = parseFloat(entryPrice);
    const takeProfitPercentage = this.config.riskManagement.takeProfitPercentage / 100;
    
    if (action === 'buy') {
      return (price * (1 + takeProfitPercentage)).toFixed(6);
    } else {
      return (price * (1 - takeProfitPercentage)).toFixed(6);
    }
  }

  /**
   * Get token pair for trading
   */
  private getTokenPair(): { tokenIn: string; tokenOut: string } | null {
    // GALA/USDC pair
    if (this.config.enabledTokens.includes('GALA') && this.config.enabledTokens.includes('USDC')) {
      return {
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC
      };
    }

    return null;
  }

  /**
   * Get current lunar phase information (for monitoring)
   */
  public getCurrentLunarPhase(): LunarPhaseInfo {
    return this.getLunarPhaseInfo(new Date());
  }

  /**
   * Get current position (for monitoring)
   */
  public getCurrentPosition() {
    return this.currentPosition;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<LunarPhaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.info('⚙️ Lunar phase configuration updated', this.config);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
