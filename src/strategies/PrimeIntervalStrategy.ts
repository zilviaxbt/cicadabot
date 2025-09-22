import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../constants/tokens';

export interface PrimeIntervalConfig {
  tokenA: string; // First token (default: USDC)
  tokenB: string; // Second token (default: GALA)
  slippageTolerance: number; // Default: 0.5%
  swapPercentage: number; // Percentage of balance to swap (default: 33%)
  feeTier: number; // Fee tier to use (default: 3000 for 0.30%)
  enabled: boolean; // Whether the strategy is enabled
}

export class PrimeCicadaStrategy {
  private bot: CicadaBot;
  private config: PrimeIntervalConfig;
  private isRunning: boolean = false;
  private currentIntervalIndex: number = 0;
  private nextSwapTime: number = 0;
  private isBuyingTokenB: boolean = true; // Start by buying tokenB (GALA)
  private intervalTimer: NodeJS.Timeout | null = null;

  // Prime numbers in minutes for the intervals
  private readonly PRIME_INTERVALS = [3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79];

  constructor(bot: CicadaBot, config: Partial<PrimeIntervalConfig> = {}) {
    this.bot = bot;
    this.config = {
      tokenA: COMMON_TOKENS.GUSDC, // USDC
      tokenB: COMMON_TOKENS.GALA,  // GALA
      slippageTolerance: 0.5,
      swapPercentage: 33,
      feeTier: FEE_TIERS.LOW, // 0.05% - using working fee tier
      enabled: true,
      ...config
    };
  }

  /**
   * Start the prime interval strategy
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      Logger.info('🔒 Prime Interval Strategy is disabled');
      return;
    }

    this.isRunning = true;
    this.currentIntervalIndex = 0;
    this.isBuyingTokenB = true;
    
    Logger.info('🚀 Starting Prime Cicada Strategy', {
      tokenA: this.getTokenSymbol(this.config.tokenA),
      tokenB: this.getTokenSymbol(this.config.tokenB),
      slippageTolerance: this.config.slippageTolerance,
      swapPercentage: this.config.swapPercentage,
      feeTier: this.config.feeTier
    });

    // Execute the first swap immediately
    Logger.info('⚡ Executing immediate first swap...');
    await this.executeSwap();

    // Note: scheduleNextSwap() is already called by executeSwap() -> moveToNextInterval()
  }

  /**
   * Stop the prime interval strategy
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer);
      this.intervalTimer = null;
    }
    Logger.info('🛑 Prime Cicada Strategy stopped');
  }

  /**
   * Schedule the next swap based on the current prime interval
   */
  private scheduleNextSwap(): void {
    if (!this.isRunning) return;

    const currentPrime = this.PRIME_INTERVALS[this.currentIntervalIndex];
    const intervalMs = currentPrime * 60 * 1000; // Convert minutes to milliseconds

    this.nextSwapTime = Date.now() + intervalMs;

    const isFirstScheduledSwap = this.currentIntervalIndex === 0;
    const logMessage = isFirstScheduledSwap 
      ? `⏰ First scheduled swap in ${currentPrime} minutes (after immediate execution)`
      : `⏰ Next swap scheduled in ${currentPrime} minutes`;

    Logger.info(logMessage, {
      currentInterval: this.currentIntervalIndex + 1,
      primeNumber: currentPrime,
      nextSwapTime: new Date(this.nextSwapTime).toISOString(),
      action: this.isBuyingTokenB ? 
        `Buy ${this.getTokenSymbol(this.config.tokenB)} with ${this.getTokenSymbol(this.config.tokenA)}` :
        `Sell ${this.getTokenSymbol(this.config.tokenB)} for ${this.getTokenSymbol(this.config.tokenA)}`
    });

    this.intervalTimer = setTimeout(() => {
      this.executeSwap();
    }, intervalMs);
  }

  /**
   * Execute the scheduled swap
   */
  private async executeSwap(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const tokenIn = this.isBuyingTokenB ? this.config.tokenA : this.config.tokenB;
      const tokenOut = this.isBuyingTokenB ? this.config.tokenB : this.config.tokenA;
      
      // Get current balance of the input token
      const balance = await this.bot.getTokenBalance(tokenIn);
      const balanceAmount = parseFloat(balance);

      Logger.info(`🔍 Balance check for ${this.getTokenSymbol(tokenIn)}:`, {
        rawBalance: balance,
        parsedBalance: balanceAmount,
        tokenIn: tokenIn,
        tokenSymbol: this.getTokenSymbol(tokenIn)
      });

      if (balanceAmount <= 0) {
        Logger.warn(`⚠️ Insufficient balance for ${this.getTokenSymbol(tokenIn)}: ${balance}`);
        this.moveToNextInterval();
        return;
      }

      // Calculate swap amount (33% of balance)
      const swapAmount = (balanceAmount * this.config.swapPercentage / 100).toFixed(6);
      
      Logger.info(`🧮 Swap calculation:`, {
        balanceAmount: balanceAmount,
        swapPercentage: this.config.swapPercentage,
        calculatedSwapAmount: swapAmount,
        calculation: `${balanceAmount} * ${this.config.swapPercentage} / 100 = ${swapAmount}`
      });

      Logger.info(`🔄 Executing prime interval swap`, {
        action: this.isBuyingTokenB ? 'BUY' : 'SELL',
        tokenIn: this.getTokenSymbol(tokenIn),
        tokenOut: this.getTokenSymbol(tokenOut),
        balance: balance,
        swapAmount: swapAmount,
        percentage: this.config.swapPercentage,
        primeInterval: this.PRIME_INTERVALS[this.currentIntervalIndex],
        slippageTolerance: parseFloat(swapAmount) > 100 ? 1.0 : this.config.slippageTolerance
      });

      // Try to get a quote with working fee tiers
      const workingFeeTiers = [
        { tier: FEE_TIERS.LOW, name: '0.05%' },
        { tier: FEE_TIERS.HIGH, name: '1.00%' }
      ];

      let quote = null;
      let workingFeeTier = this.config.feeTier;

      for (const { tier, name } of workingFeeTiers) {
        try {
          quote = await this.bot.getQuote({
            tokenIn,
            tokenOut,
            amountIn: swapAmount,
            feeTier: tier
          });

          if (quote && quote.amountOut && parseFloat(quote.amountOut) > 0) {
            workingFeeTier = tier;
            Logger.info(`📊 Quote received with ${name} fee tier: ${swapAmount} ${this.getTokenSymbol(tokenIn)} → ${quote.amountOut} ${this.getTokenSymbol(tokenOut)}`);
            break;
          }
        } catch (quoteError) {
          Logger.debug(`❌ ${name} fee tier failed: ${quoteError instanceof Error ? quoteError.message : String(quoteError)}`);
        }
      }

      if (!quote || !quote.amountOut || parseFloat(quote.amountOut) <= 0) {
        Logger.warn(`⚠️ No valid quote available for ${this.getTokenSymbol(tokenIn)} → ${this.getTokenSymbol(tokenOut)} with any working fee tier. Skipping this interval.`);
        this.moveToNextInterval();
        return;
      }

      // Execute the swap with the working fee tier
      // Use higher slippage tolerance for large amounts to avoid transaction failures
      const slippageTolerance = parseFloat(swapAmount) > 100 ? 1.0 : this.config.slippageTolerance;
      
      const result = await this.bot.executeSwap({
        tokenIn,
        tokenOut,
        amountIn: swapAmount,
        slippageTolerance: slippageTolerance,
        feeTier: workingFeeTier
      });

      if (result.success) {
        Logger.info('✅ Prime interval swap completed successfully', {
          transactionHash: result.transactionHash,
          amountIn: result.amountIn,
          amountOut: result.amountOut,
          action: this.isBuyingTokenB ? 'BOUGHT' : 'SOLD',
          primeInterval: this.PRIME_INTERVALS[this.currentIntervalIndex]
        });

        // Add result to bot for web interface display
        this.bot.addArbitrageResult({
          type: 'Prime Cicada Swap',
          amount: result.amountIn,
          profitPercentage: 0, // This strategy doesn't track profit/loss
          expectedProfit: result.amountOut,
          tokenIn: this.getTokenSymbol(tokenIn),
          tokenOut: this.getTokenSymbol(tokenOut),
          action: this.isBuyingTokenB ? 'BUY' : 'SELL',
          primeInterval: this.PRIME_INTERVALS[this.currentIntervalIndex]
        });

      } else {
        Logger.error('❌ Prime interval swap failed', {
          error: result.error,
          tokenIn: this.getTokenSymbol(tokenIn),
          tokenOut: this.getTokenSymbol(tokenOut),
          amount: swapAmount,
          primeInterval: this.PRIME_INTERVALS[this.currentIntervalIndex]
        });

        // Add failed result to bot for web interface display
        this.bot.addArbitrageResult({
          type: 'Prime Cicada Swap (FAILED)',
          amount: swapAmount,
          profitPercentage: 0,
          expectedProfit: '0',
          tokenIn: this.getTokenSymbol(tokenIn),
          tokenOut: this.getTokenSymbol(tokenOut),
          action: this.isBuyingTokenB ? 'BUY' : 'SELL',
          primeInterval: this.PRIME_INTERVALS[this.currentIntervalIndex],
          error: result.error
        });
      }

    } catch (error) {
      Logger.error('❌ Prime interval swap execution error:', {
        error: error instanceof Error ? error.message : String(error),
        primeInterval: this.PRIME_INTERVALS[this.currentIntervalIndex]
      });
    }

    // Move to next interval and toggle buy/sell
    this.moveToNextInterval();
  }

  /**
   * Move to the next prime interval and toggle buy/sell direction
   */
  private moveToNextInterval(): void {
    this.currentIntervalIndex = (this.currentIntervalIndex + 1) % this.PRIME_INTERVALS.length;
    this.isBuyingTokenB = !this.isBuyingTokenB; // Toggle between buying and selling

    // Schedule the next swap (this will be called after the immediate first swap)
    this.scheduleNextSwap();
  }

  /**
   * Get token symbol for display
   */
  private getTokenSymbol(tokenClassKey: string): string {
    const symbolMap: { [key: string]: string } = {
      [COMMON_TOKENS.GALA]: 'GALA',
      [COMMON_TOKENS.GUSDC]: 'USDC',
      [COMMON_TOKENS.GETH]: 'ETH',
      [COMMON_TOKENS.GUSDT]: 'USDT',
      [COMMON_TOKENS.GWBTC]: 'WBTC'
    };
    return symbolMap[tokenClassKey] || tokenClassKey.split('|')[0] || 'UNKNOWN';
  }

  /**
   * Get current strategy status
   */
  public getStatus(): {
    isRunning: boolean;
    currentInterval: number;
    primeNumber: number;
    nextSwapTime: Date;
    isBuyingTokenB: boolean;
    tokenA: string;
    tokenB: string;
    config: PrimeIntervalConfig;
    strategyName: string;
  } {
    return {
      isRunning: this.isRunning,
      currentInterval: this.currentIntervalIndex + 1,
      primeNumber: this.PRIME_INTERVALS[this.currentIntervalIndex],
      nextSwapTime: new Date(this.nextSwapTime),
      isBuyingTokenB: this.isBuyingTokenB,
      tokenA: this.getTokenSymbol(this.config.tokenA),
      tokenB: this.getTokenSymbol(this.config.tokenB),
      config: this.config,
      strategyName: 'Prime Cicada Strategy'
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PrimeIntervalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.info('⚙️ Prime Interval Strategy configuration updated', this.config);
  }

  /**
   * Get the list of prime intervals
   */
  public getPrimeIntervals(): number[] {
    return [...this.PRIME_INTERVALS];
  }

  /**
   * Manually trigger the next swap (for testing)
   */
  public async triggerNextSwap(): Promise<void> {
    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer);
    }
    await this.executeSwap();
  }

  /**
   * Reset the strategy to start from the beginning
   */
  public reset(): void {
    this.currentIntervalIndex = 0;
    this.isBuyingTokenB = true;
    if (this.intervalTimer) {
      clearTimeout(this.intervalTimer);
    }
    if (this.isRunning) {
      this.scheduleNextSwap();
    }
    Logger.info('🔄 Prime Cicada Strategy reset to beginning');
  }
}
