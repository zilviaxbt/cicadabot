import { CicadaBot } from '../CicadaBot';
import { Logger } from '../utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../constants/tokens';

export interface FixedArbitrageConfig {
  minProfitThreshold: number; // Minimum profit percentage
  maxPositionSize: string; // Maximum amount to trade
  checkInterval: number; // How often to check (ms)
  maxSlippage: number; // Maximum slippage tolerance
}

export interface FixedArbitrageOpportunity {
  direction: 'GALA_TO_USDC' | 'USDC_TO_GALA';
  amount: string;
  expectedProfit: number;
  profitPercentage: number;
  buyFeeTier: number;
  sellFeeTier: number;
  buyPrice: string;
  sellPrice: string;
}

export class FixedArbitrageStrategy {
  private bot: CicadaBot;
  private config: FixedArbitrageConfig;
  private isRunning: boolean = false;
  private totalTrades: number = 0;
  private totalProfit: number = 0;

  constructor(bot: CicadaBot, config: FixedArbitrageConfig) {
    this.bot = bot;
    this.config = config;
  }

  /**
   * Start fixed arbitrage monitoring
   */
  async start(): Promise<void> {
    this.isRunning = true;
    Logger.info('🚀 Starting Fixed Arbitrage Strategy', {
      minProfitThreshold: this.config.minProfitThreshold,
      maxPositionSize: this.config.maxPositionSize
    });

    while (this.isRunning) {
      try {
        await this.checkForOpportunities();
        await this.sleep(this.config.checkInterval);
      } catch (error) {
        Logger.error('❌ Arbitrage check error:', error instanceof Error ? error.message : String(error));
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Stop arbitrage monitoring
   */
  stop(): void {
    this.isRunning = false;
    Logger.info('🛑 Fixed Arbitrage Strategy stopped');
    Logger.info('📊 Final Statistics:', {
      totalTrades: this.totalTrades,
      totalProfit: this.totalProfit.toFixed(6)
    });
  }

  /**
   * Check for arbitrage opportunities in both directions
   */
  private async checkForOpportunities(): Promise<void> {
    const testAmount = '10'; // Start with small amount
    
    if (parseFloat(testAmount) > parseFloat(this.config.maxPositionSize)) {
      return;
    }

    try {
      // Check both directions
      const galaToUsdcOpportunity = await this.checkGalaToUsdcArbitrage(testAmount);
      const usdcToGalaOpportunity = await this.checkUsdcToGalaArbitrage('1'); // 1 USDC

      // Execute the best opportunity (prioritize USDC→GALA which has 40%+ profit)
      if (usdcToGalaOpportunity && usdcToGalaOpportunity.profitPercentage >= this.config.minProfitThreshold) {
        Logger.info('💰 USDC→GALA Arbitrage opportunity found:', {
          amount: usdcToGalaOpportunity.amount,
          profit: `${usdcToGalaOpportunity.profitPercentage.toFixed(4)}%`,
          expectedProfit: usdcToGalaOpportunity.expectedProfit.toFixed(6)
        });

        Logger.info('🔍 About to add USDC→GALA result to bot...');
        // Add result to bot for web interface display
        this.bot.addArbitrageResult({
          type: 'USDC→GALA Arbitrage',
          amount: usdcToGalaOpportunity.amount,
          profitPercentage: usdcToGalaOpportunity.profitPercentage,
          expectedProfit: usdcToGalaOpportunity.expectedProfit.toFixed(6),
          tokenIn: 'USDC',
          tokenOut: 'GALA'
        });
        Logger.info('✅ USDC→GALA result added to bot');
        
        // Check if strategy is still running before executing
        if (this.isRunning) {
          await this.executeUsdcToGalaArbitrage(usdcToGalaOpportunity);
        } else {
          Logger.info('🛑 Strategy stopped - skipping USDC→GALA arbitrage execution');
        }
      } else if (galaToUsdcOpportunity && galaToUsdcOpportunity.profitPercentage >= this.config.minProfitThreshold) {
        Logger.info('💰 GALA→USDC Arbitrage opportunity found:', {
          amount: galaToUsdcOpportunity.amount,
          profit: `${galaToUsdcOpportunity.profitPercentage.toFixed(4)}%`,
          expectedProfit: galaToUsdcOpportunity.expectedProfit.toFixed(6)
        });

        // Add result to bot for web interface display
        this.bot.addArbitrageResult({
          type: 'GALA→USDC Arbitrage',
          amount: galaToUsdcOpportunity.amount,
          profitPercentage: galaToUsdcOpportunity.profitPercentage,
          expectedProfit: galaToUsdcOpportunity.expectedProfit.toFixed(6),
          tokenIn: 'GALA',
          tokenOut: 'USDC'
        });
        
        // Check if strategy is still running before executing
        if (this.isRunning) {
          await this.executeGalaToUsdcArbitrage(galaToUsdcOpportunity);
        } else {
          Logger.info('🛑 Strategy stopped - skipping GALA→USDC arbitrage execution');
        }
      } else {
        Logger.debug('No profitable arbitrage opportunities found');
      }

    } catch (error) {
      Logger.debug('Arbitrage check failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check GALA → USDC arbitrage opportunities
   */
  private async checkGalaToUsdcArbitrage(amount: string): Promise<FixedArbitrageOpportunity | null> {
    const workingFeeTiers = [
      { tier: FEE_TIERS.LOW, name: '0.05%' },
      { tier: FEE_TIERS.HIGH, name: '1.00%' }
    ];

    const quotes = [];

    for (const { tier, name } of workingFeeTiers) {
      try {
        const quote = await this.bot.getQuote({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: amount,
          slippageTolerance: this.config.maxSlippage,
          feeTier: tier
        });

        quotes.push({
          feeTier: tier,
          name,
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact
        });

      } catch (error) {
        Logger.debug(`❌ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    if (quotes.length < 2) return null;

    // Find best buy and sell opportunities
    const bestBuy = quotes.reduce((best, current) => 
      parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
    );

    const bestSell = quotes.reduce((best, current) => 
      parseFloat(current.amountOut) < parseFloat(best.amountOut) ? current : best
    );

    const buyOutput = parseFloat(bestBuy.amountOut);
    const sellOutput = parseFloat(bestSell.amountOut);
    const potentialProfit = buyOutput - sellOutput;
    const profitPercentage = (potentialProfit / parseFloat(amount)) * 100;

    if (profitPercentage >= this.config.minProfitThreshold) {
      return {
        direction: 'GALA_TO_USDC',
        amount,
        expectedProfit: potentialProfit,
        profitPercentage,
        buyFeeTier: bestBuy.feeTier,
        sellFeeTier: bestSell.feeTier,
        buyPrice: bestBuy.amountOut,
        sellPrice: bestSell.amountOut
      };
    }

    return null;
  }

  /**
   * Check USDC → GALA arbitrage opportunities
   */
  private async checkUsdcToGalaArbitrage(amount: string): Promise<FixedArbitrageOpportunity | null> {
    const workingFeeTiers = [
      { tier: FEE_TIERS.LOW, name: '0.05%' },
      { tier: FEE_TIERS.HIGH, name: '1.00%' }
    ];

    const quotes = [];

    for (const { tier, name } of workingFeeTiers) {
      try {
        const quote = await this.bot.getQuote({
          tokenIn: COMMON_TOKENS.GUSDC,
          tokenOut: COMMON_TOKENS.GALA,
          amountIn: amount,
          slippageTolerance: this.config.maxSlippage,
          feeTier: tier
        });

        quotes.push({
          feeTier: tier,
          name,
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact
        });

      } catch (error) {
        Logger.debug(`❌ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    if (quotes.length < 2) return null;

    // Find best buy and sell opportunities
    const bestBuy = quotes.reduce((best, current) => 
      parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
    );

    const bestSell = quotes.reduce((best, current) => 
      parseFloat(current.amountOut) < parseFloat(best.amountOut) ? current : best
    );

    const buyOutput = parseFloat(bestBuy.amountOut);
    const sellOutput = parseFloat(bestSell.amountOut);
    const potentialProfit = buyOutput - sellOutput;
    const profitPercentage = (potentialProfit / parseFloat(amount)) * 100;

    if (profitPercentage >= this.config.minProfitThreshold) {
      return {
        direction: 'USDC_TO_GALA',
        amount,
        expectedProfit: potentialProfit,
        profitPercentage,
        buyFeeTier: bestBuy.feeTier,
        sellFeeTier: bestSell.feeTier,
        buyPrice: bestBuy.amountOut,
        sellPrice: bestSell.amountOut
      };
    }

    return null;
  }

  /**
   * Execute GALA → USDC arbitrage
   */
  private async executeGalaToUsdcArbitrage(opportunity: FixedArbitrageOpportunity): Promise<void> {
    // Check if strategy is still running before starting execution
    if (!this.isRunning) {
      Logger.info('🛑 Strategy stopped - aborting GALA→USDC arbitrage execution');
      return;
    }

    Logger.info('🎯 Executing GALA→USDC arbitrage...');

    try {
      // Step 1: Buy USDC with GALA (get more USDC for GALA)
      const buyResult = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC,
        amountIn: opportunity.amount,
        slippageTolerance: this.config.maxSlippage,
        feeTier: opportunity.buyFeeTier
      });

      if (!buyResult.success) {
        Logger.error('❌ Arbitrage buy leg failed:', buyResult.error);
        return;
      }

      // Check if strategy was stopped during buy operation
      if (!this.isRunning) {
        Logger.info('🛑 Strategy stopped during arbitrage execution - aborting sell leg');
        return;
      }

      // Step 2: Sell USDC for GALA (get less USDC for GALA)
      const sellResult = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GUSDC,
        tokenOut: COMMON_TOKENS.GALA,
        amountIn: buyResult.amountOut,
        slippageTolerance: this.config.maxSlippage,
        feeTier: opportunity.sellFeeTier
      });

      if (!sellResult.success) {
        Logger.error('❌ Arbitrage sell leg failed:', sellResult.error);
        return;
      }

      // Check if strategy was stopped after sell operation
      if (!this.isRunning) {
        Logger.info('🛑 Strategy stopped after arbitrage completion - skipping profit calculation');
        return;
      }

      // Calculate actual profit
      const actualProfit = parseFloat(sellResult.amountOut) - parseFloat(opportunity.amount);
      this.totalTrades++;
      this.totalProfit += actualProfit;

      Logger.info('🎉 GALA→USDC Arbitrage completed!', {
        buyTransaction: buyResult.transactionHash,
        sellTransaction: sellResult.transactionHash,
        expectedProfit: opportunity.expectedProfit.toFixed(6),
        actualProfit: actualProfit.toFixed(6),
        totalTrades: this.totalTrades,
        totalProfit: this.totalProfit.toFixed(6)
      });

      // Add completed trade result to bot for web interface display
      this.bot.addArbitrageResult({
        type: 'GALA→USDC Arbitrage Completed',
        amount: opportunity.amount,
        profitPercentage: (actualProfit / parseFloat(opportunity.amount)) * 100,
        expectedProfit: actualProfit.toFixed(6),
        tokenIn: 'GALA',
        tokenOut: 'USDC'
      });

    } catch (error) {
      Logger.error('❌ GALA→USDC arbitrage execution error:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Execute USDC → GALA arbitrage
   */
  private async executeUsdcToGalaArbitrage(opportunity: FixedArbitrageOpportunity): Promise<void> {
    // Check if strategy is still running before starting execution
    if (!this.isRunning) {
      Logger.info('🛑 Strategy stopped - aborting USDC→GALA arbitrage execution');
      return;
    }

    Logger.info('🎯 Executing USDC→GALA arbitrage...');

    try {
      // Step 1: Buy GALA with USDC (get more GALA for USDC)
      const buyResult = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GUSDC,
        tokenOut: COMMON_TOKENS.GALA,
        amountIn: opportunity.amount,
        slippageTolerance: this.config.maxSlippage,
        feeTier: opportunity.buyFeeTier
      });

      if (!buyResult.success) {
        Logger.error('❌ Arbitrage buy leg failed:', buyResult.error);
        return;
      }

      // Check if strategy was stopped during buy operation
      if (!this.isRunning) {
        Logger.info('🛑 Strategy stopped during arbitrage execution - aborting sell leg');
        return;
      }

      // Step 2: Sell GALA for USDC (get less GALA for USDC)
      const sellResult = await this.bot.executeSwap({
        tokenIn: COMMON_TOKENS.GALA,
        tokenOut: COMMON_TOKENS.GUSDC,
        amountIn: buyResult.amountOut,
        slippageTolerance: this.config.maxSlippage,
        feeTier: opportunity.sellFeeTier
      });

      if (!sellResult.success) {
        Logger.error('❌ Arbitrage sell leg failed:', sellResult.error);
        return;
      }

      // Check if strategy was stopped after sell operation
      if (!this.isRunning) {
        Logger.info('🛑 Strategy stopped after arbitrage completion - skipping profit calculation');
        return;
      }

      // Calculate actual profit
      const actualProfit = parseFloat(sellResult.amountOut) - parseFloat(opportunity.amount);
      this.totalTrades++;
      this.totalProfit += actualProfit;

      Logger.info('🎉 USDC→GALA Arbitrage completed!', {
        buyTransaction: buyResult.transactionHash,
        sellTransaction: sellResult.transactionHash,
        expectedProfit: opportunity.expectedProfit.toFixed(6),
        actualProfit: actualProfit.toFixed(6),
        totalTrades: this.totalTrades,
        totalProfit: this.totalProfit.toFixed(6)
      });

      // Add completed trade result to bot for web interface display
      this.bot.addArbitrageResult({
        type: 'USDC→GALA Arbitrage Completed',
        amount: opportunity.amount,
        profitPercentage: (actualProfit / parseFloat(opportunity.amount)) * 100,
        expectedProfit: actualProfit.toFixed(6),
        tokenIn: 'USDC',
        tokenOut: 'GALA'
      });

    } catch (error) {
      Logger.error('❌ USDC→GALA arbitrage execution error:', error instanceof Error ? error.message : String(error));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
