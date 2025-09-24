import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';

export interface TokenSwapConfig {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageTolerance: number;
  feeTier: number;
  intervalSeconds: number;
  minAmountOut: string; // Minimum amountOut threshold
  enabled: boolean;
}

export class TokenSwapStrategy {
  private bot: CicadaBot;
  private config: TokenSwapConfig;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private swapCount: number = 0;

  constructor(bot: CicadaBot, config: TokenSwapConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * Start the token swap strategy
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      Logger.warn('Pool Shark is already running');
      return;
    }

    this.isRunning = true;
    this.swapCount = 0;

    Logger.info('🔄 Starting Pool Shark', {
      tokenIn: this.getTokenSymbol(this.config.tokenIn),
      tokenOut: this.getTokenSymbol(this.config.tokenOut),
      amountIn: this.config.amountIn,
      intervalSeconds: this.config.intervalSeconds,
      slippageTolerance: this.config.slippageTolerance,
      feeTier: this.config.feeTier,
      minAmountOut: this.config.minAmountOut
    });

    // Execute first swap immediately
    await this.executeSwap();

    // Schedule subsequent swaps
    this.scheduleNextSwap();
  }

  /**
   * Stop the token swap strategy
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      Logger.warn('Pool Shark is not running');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    Logger.info('🛑 Pool Shark stopped', {
      totalSwaps: this.swapCount
    });
  }

  /**
   * Update strategy configuration
   */
  public updateConfig(newConfig: Partial<TokenSwapConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.info('⚙️ Pool Shark config updated', this.config);
  }

  /**
   * Get current strategy status
   */
  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      config: this.config,
      swapCount: this.swapCount,
      nextSwapTime: this.intervalId ? new Date(Date.now() + this.config.intervalSeconds * 1000) : null
    };
  }


  /**
   * Schedule the next swap
   */
  private scheduleNextSwap(): void {
    if (!this.isRunning) return;

    const intervalMs = this.config.intervalSeconds * 1000;
    
    Logger.info(`⏰ Scheduling next swap in ${this.config.intervalSeconds} seconds`);

    this.intervalId = setTimeout(() => {
      this.executeSwap();
    }, intervalMs);
  }

  /**
   * Execute a token swap
   */
  private async executeSwap(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.swapCount++;

      Logger.info(`🔄 Executing Token Swap #${this.swapCount}`, {
        tokenIn: this.getTokenSymbol(this.config.tokenIn),
        tokenOut: this.getTokenSymbol(this.config.tokenOut),
        amountIn: this.config.amountIn,
        slippageTolerance: this.config.slippageTolerance,
        feeTier: this.config.feeTier
      });

      // Check if we have sufficient balance
      const balance = await this.bot.getTokenBalance(this.config.tokenIn);
      const balanceAmount = parseFloat(balance);
      const swapAmount = parseFloat(this.config.amountIn);

      if (balanceAmount < swapAmount) {
        Logger.warn(`⚠️ Insufficient balance for swap. Required: ${swapAmount}, Available: ${balanceAmount}`);
        this.scheduleNextSwap();
        return;
      }

      // Get a quote first to check minimum amount threshold
      let quote: any = null;
      try {
        quote = await this.bot.getQuote({
          tokenIn: this.config.tokenIn,
          tokenOut: this.config.tokenOut,
          amountIn: this.config.amountIn,
          slippageTolerance: this.config.slippageTolerance,
          feeTier: this.config.feeTier
        });

        // Check minimum amount threshold
        const expectedAmountOut = parseFloat(quote.amountOut);
        const minAmountOut = parseFloat(this.config.minAmountOut);

        if (expectedAmountOut < minAmountOut) {
          Logger.warn(`⚠️ Token Swap #${this.swapCount} skipped - amountOut (${expectedAmountOut}) below minimum threshold (${minAmountOut})`);
          
          // Record skipped swap result
          this.bot.addArbitrageResult({
            type: 'Pool Shark (SKIPPED)',
            action: 'SKIPPED',
            amount: this.config.amountIn,
            profitPercentage: 0,
            expectedProfit: expectedAmountOut.toString(),
            tokenIn: this.getTokenSymbol(this.config.tokenIn),
            tokenOut: this.getTokenSymbol(this.config.tokenOut),
            expectedAmountOut: expectedAmountOut.toString(),
            minAmountOut: this.config.minAmountOut,
            reason: `Below threshold (${expectedAmountOut} < ${minAmountOut})`,
            swapNumber: this.swapCount
          });
          
          this.scheduleNextSwap();
          return;
        }

        Logger.info(`✅ Token Swap #${this.swapCount} meets minimum threshold. Expected output: ${expectedAmountOut} (min: ${minAmountOut})`);
      } catch (quoteError) {
        Logger.error(`❌ Failed to get quote for Token Swap #${this.swapCount}:`, quoteError instanceof Error ? quoteError.message : String(quoteError));
        
        // Record failed quote result
        this.bot.addArbitrageResult({
          type: 'Pool Shark (QUOTE_FAILED)',
          action: 'QUOTE_FAILED',
          amount: this.config.amountIn,
          profitPercentage: 0,
          expectedProfit: '0',
          tokenIn: this.getTokenSymbol(this.config.tokenIn),
          tokenOut: this.getTokenSymbol(this.config.tokenOut),
          reason: `Quote failed: ${quoteError instanceof Error ? quoteError.message : String(quoteError)}`,
          swapNumber: this.swapCount
        });
        
        this.scheduleNextSwap();
        return;
      }

      // Execute the swap
      const result = await this.bot.executeSwap({
        tokenIn: this.config.tokenIn,
        tokenOut: this.config.tokenOut,
        amountIn: this.config.amountIn,
        slippageTolerance: this.config.slippageTolerance,
        feeTier: this.config.feeTier
      });

      if (result.success) {
        Logger.info(`✅ Token Swap #${this.swapCount} completed successfully`, {
          transactionHash: result.transactionHash,
          amountIn: result.amountIn,
          amountOut: result.amountOut
        });

        // Record successful swap result
        this.bot.addArbitrageResult({
          type: 'Pool Shark (EXECUTED)',
          action: 'EXECUTED',
          amount: result.amountIn,
          profitPercentage: 0, // This strategy doesn't track profit/loss
          expectedProfit: result.amountOut,
          tokenIn: this.getTokenSymbol(this.config.tokenIn),
          tokenOut: this.getTokenSymbol(this.config.tokenOut),
          amountIn: result.amountIn,
          amountOut: result.amountOut,
          expectedAmountOut: quote ? quote.amountOut : 'N/A',
          minAmountOut: this.config.minAmountOut,
          transactionHash: result.transactionHash,
          swapNumber: this.swapCount
        });
      } else {
        Logger.error(`❌ Token Swap #${this.swapCount} failed`, {
          error: result.error
        });

        // Record failed swap result
        this.bot.addArbitrageResult({
          type: 'Pool Shark (FAILED)',
          action: 'FAILED',
          amount: this.config.amountIn,
          profitPercentage: 0,
          expectedProfit: '0',
          tokenIn: this.getTokenSymbol(this.config.tokenIn),
          tokenOut: this.getTokenSymbol(this.config.tokenOut),
          expectedAmountOut: quote ? quote.amountOut : 'N/A',
          minAmountOut: this.config.minAmountOut,
          reason: result.error || 'Unknown error',
          swapNumber: this.swapCount
        });
      }

      // Schedule next swap
      this.scheduleNextSwap();

    } catch (error) {
      Logger.error(`❌ Error executing Token Swap #${this.swapCount}:`, error instanceof Error ? error.message : String(error));
      
      // Record error result
      this.bot.addArbitrageResult({
        type: 'Pool Shark (ERROR)',
        action: 'ERROR',
        amount: this.config.amountIn,
        profitPercentage: 0,
        expectedProfit: '0',
        tokenIn: this.getTokenSymbol(this.config.tokenIn),
        tokenOut: this.getTokenSymbol(this.config.tokenOut),
        reason: error instanceof Error ? error.message : String(error),
        swapNumber: this.swapCount
      });
      
      this.scheduleNextSwap();
    }
  }


  /**
   * Get token symbol from token class key
   */
  private getTokenSymbol(tokenClassKey: string): string {
    const symbols: { [key: string]: string } = {
      'GALA|Unit|none|none': 'GALA',
      'GUSDC|Unit|none|none': 'USDC',
      'GETH|Unit|none|none': 'ETH',
      'GUSDT|Unit|none|none': 'USDT'
    };
    return symbols[tokenClassKey] || tokenClassKey;
  }
}
