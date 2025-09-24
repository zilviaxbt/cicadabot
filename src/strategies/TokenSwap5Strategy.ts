import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';

export interface TokenSwap5Config {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageTolerance: number;
  feeTier: number;
  intervalSeconds: number;
  minAmountOut: string; // Minimum amountOut threshold
  enabled: boolean;
}

export class TokenSwap5Strategy {
  private bot: CicadaBot;
  private config: TokenSwap5Config;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private swapCount: number = 0;

  constructor(bot: CicadaBot, config: TokenSwap5Config) {
    this.bot = bot;
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      Logger.warn('Pool Shark 5 is already running');
      return;
    }

    this.isRunning = true;
    this.swapCount = 0;

    Logger.info('🔄 Starting Pool Shark 5', {
      tokenIn: this.getTokenSymbol(this.config.tokenIn),
      tokenOut: this.getTokenSymbol(this.config.tokenOut),
      amountIn: this.config.amountIn,
      slippageTolerance: this.config.slippageTolerance,
      feeTier: this.config.feeTier,
      intervalSeconds: this.config.intervalSeconds,
      minAmountOut: this.config.minAmountOut
    });

    // Start the first swap immediately
    this.executeSwap();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      Logger.warn('Pool Shark 5 is not running');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    Logger.info('🛑 Pool Shark 5 stopped', {
      totalSwaps: this.swapCount
    });
  }

  updateConfig(newConfig: Partial<TokenSwap5Config>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.info('⚙️ Pool Shark 5 config updated', this.config);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      swapCount: this.swapCount,
      intervalSeconds: this.config.intervalSeconds,
      nextSwapTime: this.intervalId ? new Date(Date.now() + this.config.intervalSeconds * 1000) : null
    };
  }

  private getTokenSymbol(tokenAddress: string): string {
    const parts = tokenAddress.split('|');
    return parts[0] || 'Unknown';
  }

  private scheduleNextSwap(): void {
    if (!this.isRunning) return;

    const intervalMs = this.config.intervalSeconds * 1000;
    
    Logger.info(`⏰ Scheduling next swap in ${this.config.intervalSeconds} seconds`);

    this.intervalId = setTimeout(() => {
      this.executeSwap();
    }, intervalMs);
  }

  private async executeSwap(): Promise<any> {
    if (!this.isRunning) return;

    this.swapCount++;
    Logger.info(`🔄 Executing Token Swap 5 #${this.swapCount}`, {
      tokenIn: this.getTokenSymbol(this.config.tokenIn),
      tokenOut: this.getTokenSymbol(this.config.tokenOut),
      amountIn: this.config.amountIn,
      slippageTolerance: this.config.slippageTolerance,
      feeTier: this.config.feeTier,
      minAmountOut: this.config.minAmountOut
    });

    try {
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
          Logger.warn(`⚠️ Token Swap 5 #${this.swapCount} skipped - amountOut (${expectedAmountOut}) below minimum threshold (${minAmountOut})`);
          
          // Record skipped swap result
          this.bot.addArbitrageResult({
            type: 'Pool Shark 5 (SKIPPED)',
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

        Logger.info(`✅ Token Swap 5 #${this.swapCount} meets minimum threshold. Expected output: ${expectedAmountOut} (min: ${minAmountOut})`);
      } catch (quoteError) {
        Logger.error(`❌ Failed to get quote for Token Swap 5 #${this.swapCount}:`, quoteError instanceof Error ? quoteError.message : String(quoteError));
        
        // Record failed quote result
        this.bot.addArbitrageResult({
          type: 'Pool Shark 5 (QUOTE_FAILED)',
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
        Logger.info(`✅ Token Swap 5 #${this.swapCount} completed successfully`, {
          transactionHash: result.transactionHash,
          amountIn: result.amountIn,
          amountOut: result.amountOut
        });

        // Record successful swap result
        this.bot.addArbitrageResult({
          type: 'Pool Shark 5 (EXECUTED)',
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
        Logger.error(`❌ Token Swap 5 #${this.swapCount} failed`, {
          error: result.error
        });

        // Record failed swap result
        this.bot.addArbitrageResult({
          type: 'Pool Shark 5 (FAILED)',
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

    } catch (error: any) {
      Logger.error(`❌ Error executing Token Swap 5 #${this.swapCount}:`, error instanceof Error ? error.message : String(error));
      
      // Record error result
      this.bot.addArbitrageResult({
        type: 'Pool Shark 5 (ERROR)',
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
}
