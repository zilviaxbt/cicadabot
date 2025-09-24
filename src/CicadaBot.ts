import { GSwap, PrivateKeySigner, GSwapSDKError } from '@gala-chain/gswap-sdk';
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { BotConfig, SwapParams, SwapResult, QuoteResult, PortfolioSummary, BotStatus } from './types';
import { Logger } from './utils/logger';
import { COMMON_TOKENS, FEE_TIERS, DEFAULT_SLIPPAGE, getTokenSymbol } from './constants/tokens';

// Polyfill fetch for Node.js
(global as any).fetch = fetch;

export interface TransactionRecord {
  id: string;
  timestamp: string;
  type: 'swap' | 'arbitrage' | 'quote';
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  transactionHash?: string;
  feeTier?: number;
  priceImpact?: string;
  status: 'pending' | 'completed' | 'failed';
  strategy?: string;
  profit?: string;
  pnl?: string; // Profit or Loss for the transaction
  pnlPercentage?: string; // PnL as a percentage
}

export class CicadaBot {
  private gswap: GSwap;
  private config: BotConfig;
  private logger: typeof Logger;
  private isConnected: boolean = false;
  private errorCount: number = 0;
  private lastActivity?: Date;
  private transactionHistory: TransactionRecord[] = [];
  private transactionHistoryFile: string;

  constructor(config: BotConfig) {
    this.config = config;
    this.logger = Logger;
    
    // Initialize transaction history file
    this.transactionHistoryFile = path.join(process.cwd(), 'data', 'transaction-history.json');
    this.loadTransactionHistory();
    
    // Initialize GSwap SDK
    this.gswap = new GSwap({
      signer: new PrivateKeySigner(config.privateKey),
      walletAddress: config.walletAddress,
      gatewayBaseUrl: config.gatewayBaseUrl,
      transactionWaitTimeoutMs: config.transactionWaitTimeoutMs,
    });

    this.logger.info('Cicada Bot initialized', {
      walletAddress: config.walletAddress,
      gatewayBaseUrl: config.gatewayBaseUrl || 'default'
    });
  }

  /**
   * Initialize the bot and connect to event socket
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Cicada Bot...');
      
      // Connect to event socket for real-time transaction monitoring
      await GSwap.events.connectEventSocket();
      this.isConnected = true;
      
      this.logger.info('Cicada Bot initialized successfully', {
        connected: this.isConnected,
        walletAddress: this.config.walletAddress
      });
    } catch (error) {
      this.errorCount++;
      this.logger.error('Failed to initialize Cicada Bot', error);
      throw error;
    }
  }

  /**
   * Get current bot status
   */
  public getStatus(): BotStatus {
    return {
      connected: this.isConnected,
      walletAddress: this.config.walletAddress,
      lastActivity: this.lastActivity,
      errorCount: this.errorCount
    };
  }

  /**
   * Get a quote for a token swap
   */
  public async getQuote(params: SwapParams): Promise<QuoteResult> {
    try {
      this.logger.info('Getting quote for swap', {
        tokenIn: getTokenSymbol(params.tokenIn),
        tokenOut: getTokenSymbol(params.tokenOut),
        amountIn: params.amountIn
      });

      const quote = await this.gswap.quoting.quoteExactInput(
        params.tokenIn,
        params.tokenOut,
        params.amountIn,
        params.feeTier
      );

      const result: QuoteResult = {
        amountIn: quote.inTokenAmount.toString(),
        amountOut: quote.outTokenAmount.toString(),
        priceImpact: quote.priceImpact.toString(),
        feeTier: quote.feeTier,
        currentPrice: quote.currentPrice.toString(),
        newPrice: quote.newPrice.toString()
      };

      this.logger.info('Quote received', {
        amountOut: result.amountOut,
        priceImpact: result.priceImpact,
        feeTier: result.feeTier
      });

      return result;
    } catch (error) {
      this.errorCount++;
      this.logger.error('Failed to get quote', error);
      throw error;
    }
  }

  /**
   * Execute a token swap
   */
  public async executeSwap(params: SwapParams): Promise<SwapResult> {
    let transactionId: string | undefined;
    
    try {
      this.logger.info('Executing swap', {
        tokenIn: getTokenSymbol(params.tokenIn),
        tokenOut: getTokenSymbol(params.tokenOut),
        amountIn: params.amountIn
      });

      // Get quote first to determine output amount
      const quote = await this.getQuote(params);
      
      // Calculate PnL for the swap (includes gas fees and real-time prices)
      const pnl = await this.calculateSwapPnL(params.amountIn, quote.amountOut, params.tokenIn, params.tokenOut);
      
      // Record transaction as pending
      transactionId = this.addTransaction({
        type: 'swap',
        tokenIn: getTokenSymbol(params.tokenIn),
        tokenOut: getTokenSymbol(params.tokenOut),
        amountIn: params.amountIn,
        amountOut: quote.amountOut,
        feeTier: quote.feeTier,
        priceImpact: quote.priceImpact,
        status: 'pending',
        pnl: pnl.absolute,
        pnlPercentage: pnl.percentage
      });
      
      // Calculate minimum output with slippage protection
      const slippage = params.slippageTolerance || DEFAULT_SLIPPAGE;
      const slippageMultiplier = (100 - slippage) / 100;
      const amountOutMinimum = new BigNumber(quote.amountOut)
        .multipliedBy(slippageMultiplier)
        .toFixed();

      this.logger.info('Swap parameters calculated', {
        expectedOutput: quote.amountOut,
        minimumOutput: amountOutMinimum,
        slippageTolerance: slippage
      });

      // Execute the swap
      const swapResult = await this.gswap.swaps.swap(
        params.tokenIn,
        params.tokenOut,
        quote.feeTier,
        {
          exactIn: params.amountIn,
          amountOutMinimum: amountOutMinimum
        },
        this.config.walletAddress
      );

      this.logger.info('Swap transaction submitted');

      // Wait for transaction completion
      const completed = await swapResult.wait();
      this.lastActivity = new Date();

      const result: SwapResult = {
        success: true,
        transactionHash: completed.transactionHash,
        amountIn: params.amountIn,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        feeTier: quote.feeTier
      };

      // Update transaction status to completed
      if (transactionId) {
        this.updateTransactionStatus(transactionId, 'completed', completed.transactionHash);
      }

      this.logger.info('Swap completed successfully', {
        transactionHash: result.transactionHash,
        amountIn: result.amountIn,
        amountOut: result.amountOut
      });

      return result;
    } catch (error) {
      this.errorCount++;
      this.logger.error('Swap execution failed', error);
      
      // Update transaction status to failed
      if (transactionId) {
        this.updateTransactionStatus(transactionId, 'failed');
      }
      
      return {
        success: false,
        amountIn: params.amountIn,
        amountOut: '0',
        error: error instanceof GSwapSDKError ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's portfolio summary
   */
  public async getPortfolioSummary(): Promise<PortfolioSummary> {
    try {
      this.logger.info('Fetching portfolio summary');

      // Get user assets with better error handling
      let assets;
      try {
        assets = await this.gswap.assets.getUserAssets(this.config.walletAddress, 1, 10);
      } catch (assetError) {
        this.logger.warn('Failed to get user assets, wallet might be empty', { 
          error: assetError instanceof Error ? assetError.message : String(assetError) 
        });
        // Return empty portfolio if assets call fails
        assets = { count: 0, tokens: [] };
      }
      
      // Get user positions with better error handling
      let positions;
      try {
        positions = await this.gswap.positions.getUserPositions(this.config.walletAddress);
      } catch (positionError) {
        this.logger.warn('Failed to get user positions, wallet might have no liquidity positions', { 
          error: positionError instanceof Error ? positionError.message : String(positionError) 
        });
        // Return empty positions if positions call fails
        positions = { positions: [] };
      }

      const summary: PortfolioSummary = {
        totalTokens: assets.count || 0,
        tokens: (assets.tokens || []).map(token => ({
          symbol: token.symbol,
          balance: token.quantity,
          decimals: token.decimals,
          verified: token.verify
        })),
        positions: (positions.positions || []).map(pos => ({
          pair: `${pos.token0Symbol}/${pos.token1Symbol}`,
          fee: pos.fee,
          liquidity: pos.liquidity.toString()
        }))
      };

      this.logger.info('Portfolio summary retrieved', {
        totalTokens: summary.totalTokens,
        activePositions: summary.positions.length
      });

      return summary;
    } catch (error) {
      this.errorCount++;
      this.logger.error('Failed to get portfolio summary', error);
      
      // Return empty portfolio instead of throwing error
      return {
        totalTokens: 0,
        tokens: [],
        positions: []
      };
    }
  }

  /**
   * Get balance for a specific token
   */
  public async getTokenBalance(tokenClassKey: string): Promise<string> {
    try {
      const assets = await this.gswap.assets.getUserAssets(this.config.walletAddress, 1, 10);
      
      this.logger.debug('Available tokens:', assets.tokens.map(t => ({
        symbol: t.symbol,
        quantity: t.quantity,
        fullKey: `${t.symbol}|Unit|none|none`
      })));
      
      this.logger.debug('Looking for token:', {
        tokenClassKey: tokenClassKey,
        expectedSymbol: getTokenSymbol(tokenClassKey)
      });
      
      const token = assets.tokens.find(t => 
        `${t.symbol}|Unit|none|none` === tokenClassKey || 
        t.symbol === getTokenSymbol(tokenClassKey)
      );
      
      this.logger.debug('Token found:', token ? {
        symbol: token.symbol,
        quantity: token.quantity
      } : 'No token found');
      
      return token ? token.quantity : '0';
    } catch (error) {
      this.errorCount++;
      this.logger.error('Failed to get token balance', error);
      // Return '0' instead of throwing error for better UX
      return '0';
    }
  }

  /**
   * Get current price for a token pair
   */
  public async getCurrentPrice(tokenIn: string, tokenOut: string, feeTier?: number): Promise<string> {
    try {
      const quote = await this.gswap.quoting.quoteExactInput(
        tokenIn,
        tokenOut,
        '1', // 1 unit for price calculation
        feeTier
      );
      
      return quote.currentPrice.toString();
    } catch (error) {
      this.errorCount++;
      this.logger.error('Failed to get current price', error);
      throw error;
    }
  }

  /**
   * Check if the bot is ready for trading
   */
  public isReady(): boolean {
    return this.isConnected && this.errorCount < 10; // Allow up to 10 errors
  }

  /**
   * Disconnect and cleanup
   */
  public async disconnect(): Promise<void> {
    try {
      GSwap.events.disconnectEventSocket();
      this.isConnected = false;
      this.logger.info('Cicada Bot disconnected');
    } catch (error) {
      this.logger.error('Error during disconnect', error);
    }
  }

  /**
   * Get common token constants
   */
  public static getCommonTokens() {
    return COMMON_TOKENS;
  }

  /**
   * Get available fee tiers
   */
  public static getFeeTiers() {
    return FEE_TIERS;
  }

  /**
   * Get real-time token prices from pools
   */
  private async getTokenPrices(): Promise<{ [key: string]: number }> {
    try {
      const prices: { [key: string]: number } = {
        'USDC': 1.0,      // USDC is always $1.00
        'USDT': 1.0,      // USDT is always $1.00
      };

      // Optional GALA override via env for backfill/recalc scenarios
      const overrideGala = parseFloat(process.env.GALA_PRICE_OVERRIDE_USD as any);
      if (!isNaN(overrideGala) && overrideGala > 0) {
        prices['GALA'] = overrideGala;
        this.logger.debug(`GALA price (override): $${overrideGala}`);
      }

      // Try CoinGecko first for GALA (more stable reference) if no override present
      try {
        const cgResp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=gala&vs_currencies=usd', { timeout: 4000 } as any);
        if (cgResp.ok) {
          const cgJson: any = await cgResp.json();
          const galaUsd = cgJson?.gala?.usd;
          if (typeof galaUsd === 'number' && galaUsd > 0) {
            prices['GALA'] = prices['GALA'] ?? galaUsd;
            this.logger.debug(`GALA price (CoinGecko): $${galaUsd}`);
          }
        }
      } catch (e) {
        // ignore and fall back to pool quote below
      }

      // If CoinGecko didn't set it, get GALA price from GALA/USDC pool
      try {
        const galaUsdcQuote = await this.gswap.quoting.quoteExactInput(
          COMMON_TOKENS.GALA,
          COMMON_TOKENS.GUSDC,
          '1', // 1 GALA
          FEE_TIERS.LOW // Use working fee tier
        );
        // The quote gives us USDC amount for 1 GALA, which is the GALA price in USD
        const galaPrice = parseFloat(galaUsdcQuote.outTokenAmount.toString());
        prices['GALA'] = prices['GALA'] ?? galaPrice;
        this.logger.debug(`GALA price calculated: $${galaPrice}`);
      } catch (error) {
        this.logger.debug('Failed to get GALA price, using fallback', error);
        prices['GALA'] = prices['GALA'] ?? 0.0063; // Fallback price if neither source worked
      }

      // Get ETH price from ETH/USDC pool (if available)
      try {
        const ethUsdcQuote = await this.gswap.quoting.quoteExactInput(
          COMMON_TOKENS.GETH,
          COMMON_TOKENS.GUSDC,
          '1', // 1 ETH
          FEE_TIERS.LOW // Use working fee tier
        );
        prices['ETH'] = parseFloat(ethUsdcQuote.outTokenAmount.toString());
        prices['GETH'] = prices['ETH']; // Same price for GETH
      } catch (error) {
        this.logger.debug('Failed to get ETH price, using fallback', error);
        prices['ETH'] = 4310.0; // Updated fallback price
        prices['GETH'] = 4310.0;
      }

      // Get WBTC price from WBTC/USDC pool (if available)
      try {
        const wbtcUsdcQuote = await this.gswap.quoting.quoteExactInput(
          COMMON_TOKENS.GWBTC,
          COMMON_TOKENS.GUSDC,
          '1', // 1 WBTC
          FEE_TIERS.LOW // Use working fee tier
        );
        prices['WBTC'] = parseFloat(wbtcUsdcQuote.outTokenAmount.toString());
        prices['GWBTC'] = prices['WBTC']; // Same price for GWBTC
      } catch (error) {
        this.logger.debug('Failed to get WBTC price, using fallback', error);
        prices['WBTC'] = 100000.0; // Fallback price
        prices['GWBTC'] = 100000.0;
      }

      this.logger.debug('Token prices fetched:', prices);
      return prices;

    } catch (error) {
      this.logger.warn('Failed to fetch token prices, using fallbacks', error);
      // Return fallback prices
      return {
        'GALA': 0.017,
        'USDC': 1.0,
        'USDT': 1.0,
        'ETH': 4310.0,
        'GETH': 4310.0,
        'WBTC': 100000.0,
        'GWBTC': 100000.0
      };
    }
  }

  // Arbitrage Strategy Management
  private currentStrategy: any = null;
  private strategies: Map<string, any> = new Map(); // Support multiple strategies
  private strategyResults: any[] = [];

  /**
   * Start an arbitrage strategy
   */
  public async startArbitrageStrategy(strategyName: string, config: any = {}) {
    try {
      // For non-Pool Shark strategies, stop any existing strategy
      if (!['token-swap', 'token-swap-2', 'token-swap-3', 'token-swap-4', 'token-swap-5'].includes(strategyName) && this.currentStrategy) {
        await this.stopArbitrageStrategy();
      }
      
      // For Pool Shark strategies, check if already running
      if (['token-swap', 'token-swap-2', 'token-swap-3', 'token-swap-4', 'token-swap-5'].includes(strategyName) && this.strategies.has(strategyName)) {
        this.logger.warn(`Strategy '${strategyName}' is already running`);
        return;
      }

      this.logger.info(`Starting arbitrage strategy: ${strategyName}`, config);

      // Import and instantiate the selected strategy
      let StrategyClass;
      switch (strategyName) {
        case 'simple':
          const { SimpleArbitrageStrategy } = await import('./strategies/SimpleArbitrageStrategy');
          StrategyClass = SimpleArbitrageStrategy;
          break;
        case 'fixed':
          const { FixedArbitrageStrategy } = await import('./strategies/FixedArbitrageStrategy');
          StrategyClass = FixedArbitrageStrategy;
          break;
        case 'optimized':
          const { OptimizedArbitrageStrategy } = await import('./strategies/OptimizedArbitrageStrategy');
          StrategyClass = OptimizedArbitrageStrategy;
          break;
        case 'price-difference':
          const { PriceDifferenceStrategy } = await import('./strategies/PriceDifferenceStrategy');
          StrategyClass = PriceDifferenceStrategy;
          break;
        case 'advanced':
          const { ArbitrageStrategy } = await import('./strategies/ArbitrageStrategy');
          StrategyClass = ArbitrageStrategy;
          break;
        case 'lunar':
          const { LunarPhaseStrategy } = await import('./strategies/LunarPhaseStrategy');
          StrategyClass = LunarPhaseStrategy;
          break;
        case 'prime':
          const { PrimeCicadaStrategy } = await import('./strategies/PrimeIntervalStrategy');
          StrategyClass = PrimeCicadaStrategy;
          break;
        case 'token-swap':
          const { TokenSwapStrategy } = await import('./strategies/TokenSwapStrategy');
          StrategyClass = TokenSwapStrategy;
          break;
        case 'token-swap-2':
          const { TokenSwap2Strategy } = await import('./strategies/TokenSwap2Strategy');
          StrategyClass = TokenSwap2Strategy;
          break;
        case 'token-swap-3':
          const { TokenSwap3Strategy } = await import('./strategies/TokenSwap3Strategy');
          StrategyClass = TokenSwap3Strategy;
          break;
        case 'token-swap-4':
          const { TokenSwap4Strategy } = await import('./strategies/TokenSwap4Strategy');
          StrategyClass = TokenSwap4Strategy;
          break;
        case 'token-swap-5':
          const { TokenSwap5Strategy } = await import('./strategies/TokenSwap5Strategy');
          StrategyClass = TokenSwap5Strategy;
          break;
        default:
          throw new Error(`Unknown strategy: ${strategyName}`);
      }

      // Create strategy instance with default config
      let defaultConfig: any = {
        minProfitThreshold: 0.5,
        maxPositionSize: '100',
        maxSlippage: 0.5,
        scanInterval: 5000,
        ...config
      };

      // Strategy-specific default configs
        if (strategyName === 'token-swap') {
          defaultConfig = {
            tokenIn: 'GALA|Unit|none|none',
            tokenOut: 'GUSDC|Unit|none|none',
            amountIn: '10',
            slippageTolerance: 1.0,
            feeTier: 500,
            intervalSeconds: 30,
            minAmountOut: '9.5', // Minimum amountOut threshold (5% below expected)
            enabled: true,
            ...config
          };
        } else if (strategyName === 'token-swap-2') {
          defaultConfig = {
            tokenIn: 'GUSDC|Unit|none|none',
            tokenOut: 'GALA|Unit|none|none',
            amountIn: '10',
            slippageTolerance: 1.0,
            feeTier: 500,
            intervalSeconds: 30,
            minAmountOut: '9.5', // Minimum amountOut threshold (5% below expected)
            enabled: true,
            ...config
          };
        } else if (strategyName === 'token-swap-3') {
          defaultConfig = {
            tokenIn: 'GETH|Unit|none|none',
            tokenOut: 'GUSDC|Unit|none|none',
            amountIn: '0.1',
            slippageTolerance: 1.0,
            feeTier: 500,
            intervalSeconds: 45,
            minAmountOut: '200',
            enabled: true,
            ...config
          };
        } else if (strategyName === 'token-swap-4') {
          defaultConfig = {
            tokenIn: 'GUSDT|Unit|none|none',
            tokenOut: 'GALA|Unit|none|none',
            amountIn: '50',
            slippageTolerance: 1.0,
            feeTier: 500,
            intervalSeconds: 60,
            minAmountOut: '500',
            enabled: true,
            ...config
          };
        } else if (strategyName === 'token-swap-5') {
          defaultConfig = {
            tokenIn: 'GALA|Unit|none|none',
            tokenOut: 'GETH|Unit|none|none',
            amountIn: '100',
            slippageTolerance: 1.0,
            feeTier: 500,
            intervalSeconds: 90,
            minAmountOut: '0.05',
            enabled: true,
            ...config
          };
        } else if (strategyName === 'lunar') {
        defaultConfig = {
          minTradeAmount: '10',
          maxTradeAmount: '100',
          checkInterval: 300000, // 5 minutes
          maxSlippage: 0.5,
          enabledTokens: ['GALA', 'USDC'],
          strategy: 'both',
          phaseThreshold: 2,
          riskManagement: {
            stopLossPercentage: 5,
            takeProfitPercentage: 10,
            maxPositionSize: 20
          },
          ...config
        };
      }

      // Prime interval strategy specific defaults
      if (strategyName === 'prime') {
        defaultConfig = {
          tokenA: COMMON_TOKENS.GUSDC, // USDC
          tokenB: COMMON_TOKENS.GALA,  // GALA
          slippageTolerance: 0.5,
          swapPercentage: 33,
          feeTier: FEE_TIERS.LOW, // 0.05% - using working fee tier
          enabled: true,
          ...config
        };
      }

      const strategyInstance = new StrategyClass(this, defaultConfig);
      await strategyInstance.start();

      // Store strategy instance
      if (['token-swap', 'token-swap-2', 'token-swap-3', 'token-swap-4', 'token-swap-5'].includes(strategyName)) {
        this.strategies.set(strategyName, strategyInstance);
      } else {
        this.currentStrategy = strategyInstance;
      }

      this.logger.info(`Arbitrage strategy '${strategyName}' started successfully`);

      return {
        strategy: strategyName,
        config: defaultConfig,
        status: 'running'
      };

    } catch (error) {
      this.errorCount++;
      this.logger.error('Failed to start arbitrage strategy', error);
      throw error;
    }
  }

  /**
   * Stop the current arbitrage strategy
   */
  public async stopArbitrageStrategy(strategyName?: string) {
    try {
      if (strategyName) {
        // Stop specific strategy
        if (['token-swap', 'token-swap-2', 'token-swap-3', 'token-swap-4', 'token-swap-5'].includes(strategyName)) {
          const strategy = this.strategies.get(strategyName);
          if (!strategy) {
            this.logger.warn(`Strategy '${strategyName}' is not running`);
            return {
              status: 'stopped',
              message: `Strategy '${strategyName}' was not running`
            };
          }
          
          this.logger.info(`Stopping strategy: ${strategyName}`);
          await strategy.stop();
          this.strategies.delete(strategyName);
          
          this.logger.info(`Strategy '${strategyName}' stopped successfully`);
          return {
            status: 'stopped',
            strategy: strategyName,
            message: `Strategy '${strategyName}' stopped successfully`
          };
        } else {
          // Stop non-Pool Shark strategy
          if (!this.currentStrategy) {
            this.logger.warn('No arbitrage strategy is currently running');
            return {
              status: 'stopped',
              message: 'No strategy was running'
            };
          }

          this.logger.info('Stopping arbitrage strategy');
          await this.currentStrategy.stop();
          this.currentStrategy = null;

          this.logger.info('Arbitrage strategy stopped successfully');
        }
      } else {
        // Stop all strategies
        if (!this.currentStrategy && this.strategies.size === 0) {
          this.logger.warn('No arbitrage strategies are currently running');
          return {
            status: 'stopped',
            message: 'No strategies were running'
          };
        }

        this.logger.info('Stopping all arbitrage strategies');
        
        // Stop current strategy
        if (this.currentStrategy) {
          await this.currentStrategy.stop();
          this.currentStrategy = null;
        }
        
        // Stop all Pool Shark strategies
        for (const [, strategy] of this.strategies) {
          await strategy.stop();
        }
        this.strategies.clear();

        this.logger.info('All arbitrage strategies stopped successfully');
      }

      return {
        status: 'stopped',
        message: 'Strategy stopped successfully'
      };

    } catch (error) {
      this.errorCount++;
      this.logger.error('Failed to stop arbitrage strategy', error);
      throw error;
    }
  }

  /**
   * Get arbitrage strategy status
   */
  public getArbitrageStatus() {
    let strategyName = null;
    let isRunning = false;
    
    if (this.currentStrategy) {
      isRunning = true;
      // Get user-friendly strategy name
      if (this.currentStrategy.constructor.name === 'PrimeCicadaStrategy') {
        strategyName = 'PrimeCicadaStrategy';
      } else {
        strategyName = this.currentStrategy.constructor.name;
      }
    }
    
    // Check if any Pool Shark strategies are running
    if (this.strategies.size > 0) {
      isRunning = true;
      if (!strategyName) {
        strategyName = 'Multiple Pool Shark Strategies';
      }
    }
    
    return {
      isRunning: isRunning,
      strategy: strategyName,
      resultsCount: this.strategyResults.length,
      runningStrategies: Array.from(this.strategies.keys())
    };
  }

  /**
   * Get arbitrage strategy results
   */
  public getArbitrageResults() {
    return this.strategyResults.slice(-10); // Return last 10 results
  }

  /**
   * Get current strategy instance
   */
  public getCurrentStrategy() {
    return this.currentStrategy;
  }

  /**
   * Get specific strategy instance
   */
  public getStrategy(strategyName: string) {
    if (['token-swap', 'token-swap-2', 'token-swap-3', 'token-swap-4', 'token-swap-5'].includes(strategyName)) {
      return this.strategies.get(strategyName);
    }
    return this.currentStrategy;
  }

  /**
   * Add arbitrage result (called by strategies)
   */
  public addArbitrageResult(result: any) {
    const resultWithTimestamp = {
      ...result,
      timestamp: new Date().toISOString()
    };
    
    this.strategyResults.push(resultWithTimestamp);
    
    Logger.info('📊 Arbitrage result added to bot:', {
      type: result.type,
      amount: result.amount,
      profitPercentage: result.profitPercentage,
      totalResults: this.strategyResults.length
    });

    // Keep only last 100 results
    if (this.strategyResults.length > 100) {
      this.strategyResults = this.strategyResults.slice(-100);
    }
  }

  /**
   * Load transaction history from file
   */
  private loadTransactionHistory() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.transactionHistoryFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.transactionHistoryFile)) {
        const data = fs.readFileSync(this.transactionHistoryFile, 'utf8');
        this.transactionHistory = JSON.parse(data);
        this.logger.info(`Loaded ${this.transactionHistory.length} transaction records`);
      }
    } catch (error) {
      this.logger.warn('Failed to load transaction history', error);
      this.transactionHistory = [];
    }
  }

  /**
   * Save transaction history to file
   */
  private saveTransactionHistory() {
    try {
      fs.writeFileSync(this.transactionHistoryFile, JSON.stringify(this.transactionHistory, null, 2));
    } catch (error) {
      this.logger.error('Failed to save transaction history', error);
    }
  }

  /**
   * Add a transaction record
   */
  public addTransaction(transaction: Omit<TransactionRecord, 'id' | 'timestamp'>): string {
    const record: TransactionRecord = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    this.transactionHistory.unshift(record); // Add to beginning

    // Keep only last 1000 transactions
    if (this.transactionHistory.length > 1000) {
      this.transactionHistory = this.transactionHistory.slice(0, 1000);
    }

    this.saveTransactionHistory();
    this.logger.info('Transaction recorded', { id: record.id, type: record.type });
    
    return record.id;
  }

  /**
   * Update transaction status
   */
  public updateTransactionStatus(id: string, status: 'pending' | 'completed' | 'failed', transactionHash?: string) {
    const transaction = this.transactionHistory.find(tx => tx.id === id);
    if (transaction) {
      transaction.status = status;
      if (transactionHash) {
        transaction.transactionHash = transactionHash;
      }
      this.saveTransactionHistory();
      this.logger.info('Transaction status updated', { id, status, transactionHash });
    }
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(limit: number = 50): TransactionRecord[] {
    return this.transactionHistory.slice(0, limit);
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(id: string): TransactionRecord | undefined {
    return this.transactionHistory.find(tx => tx.id === id);
  }

  /**
   * Recalculate PnL for a transaction (defaults to most recent)
   */
  public async recalculateTransaction(id?: string): Promise<TransactionRecord | undefined> {
    const tx = id ? this.transactionHistory.find(t => t.id === id) : this.transactionHistory[0];
    if (!tx) return undefined;
    if (tx.type !== 'swap') return tx;

    const tokenInKey = Object.values(COMMON_TOKENS).find(k => getTokenSymbol(k) === tx.tokenIn) || tx.tokenIn;
    const tokenOutKey = Object.values(COMMON_TOKENS).find(k => getTokenSymbol(k) === tx.tokenOut) || tx.tokenOut;

    const pnl = await this.calculateSwapPnL(tx.amountIn, tx.amountOut, tokenInKey, tokenOutKey);
    tx.pnl = pnl.absolute;
    tx.pnlPercentage = pnl.percentage;
    this.saveTransactionHistory();
    this.logger.info('Recalculated transaction PnL', { id: tx.id, pnl: tx.pnl, pnlPercentage: tx.pnlPercentage });
    return tx;
  }

  /**
   * Recalculate PnL for all swap transactions in history
   */
  public async recalculateAllTransactions(): Promise<number> {
    let updated = 0;
    for (const tx of this.transactionHistory) {
      if (tx.type !== 'swap') continue;
      const tokenInKey = Object.values(COMMON_TOKENS).find(k => getTokenSymbol(k) === tx.tokenIn) || tx.tokenIn;
      const tokenOutKey = Object.values(COMMON_TOKENS).find(k => getTokenSymbol(k) === tx.tokenOut) || tx.tokenOut;
      const pnl = await this.calculateSwapPnL(tx.amountIn, tx.amountOut, tokenInKey, tokenOutKey);
      tx.pnl = pnl.absolute;
      tx.pnlPercentage = pnl.percentage;
      updated++;
    }
    if (updated > 0) this.saveTransactionHistory();
    this.logger.info('Recalculated PnL for transactions', { updated });
    return updated;
  }

  /**
   * Recalculate PnL for swap transactions in the last N hours
   */
  public async recalculateTransactionsSince(hours: number): Promise<number> {
    const cutoff = Date.now() - Math.max(0, hours) * 60 * 60 * 1000;
    let updated = 0;
    for (const tx of this.transactionHistory) {
      if (tx.type !== 'swap') continue;
      const ts = Date.parse(tx.timestamp);
      if (isNaN(ts) || ts < cutoff) continue;
      const tokenInKey = Object.values(COMMON_TOKENS).find(k => getTokenSymbol(k) === tx.tokenIn) || tx.tokenIn;
      const tokenOutKey = Object.values(COMMON_TOKENS).find(k => getTokenSymbol(k) === tx.tokenOut) || tx.tokenOut;
      const pnl = await this.calculateSwapPnL(tx.amountIn, tx.amountOut, tokenInKey, tokenOutKey);
      tx.pnl = pnl.absolute;
      tx.pnlPercentage = pnl.percentage;
      updated++;
    }
    if (updated > 0) this.saveTransactionHistory();
    this.logger.info('Recalculated PnL for recent transactions', { hours, updated });
    return updated;
  }

  /**
   * Calculate Profit or Loss for a swap transaction
   * This uses real-time prices from pools and includes gas fees
   */
  private async calculateSwapPnL(amountIn: string, amountOut: string, tokenIn: string, tokenOut: string): Promise<{ absolute: string, percentage: string }> {
    try {
      const tokenInSymbol = getTokenSymbol(tokenIn);
      const tokenOutSymbol = getTokenSymbol(tokenOut);
      
      // If it's the same token, PnL is 0
      if (tokenInSymbol === tokenOutSymbol) {
        return { absolute: '0', percentage: '0' };
      }
      
      // Prefer valuing both legs using USD token prices first (CoinGecko-backed for GALA).
      // If any price is unavailable, we fall back to pool quotes for the exact amounts.
      let inputUSD: BigNumber | null = null;
      let outputUSD: BigNumber | null = null;

      const snapshotPrices = await this.getTokenPrices();
      const inPrice = snapshotPrices[tokenInSymbol];
      const outPrice = snapshotPrices[tokenOutSymbol];
      if (typeof inPrice === 'number' && inPrice > 0) {
        inputUSD = new BigNumber(amountIn).multipliedBy(inPrice);
      }
      if (typeof outPrice === 'number' && outPrice > 0) {
        outputUSD = new BigNumber(amountOut).multipliedBy(outPrice);
      }

      if (inputUSD === null) try {
        if (tokenInSymbol === 'USDC') {
          inputUSD = new BigNumber(amountIn);
        } else {
          const inClassKey = tokenInSymbol === 'GALA' ? COMMON_TOKENS.GALA
                            : tokenInSymbol === 'USDT' ? COMMON_TOKENS.GUSDT
                            : tokenInSymbol === 'ETH' ? COMMON_TOKENS.GETH
                            : tokenInSymbol === 'WBTC' ? COMMON_TOKENS.GWBTC
                            : undefined;
          if (inClassKey) {
            const inQuote = await this.gswap.quoting.quoteExactInput(
              inClassKey,
              COMMON_TOKENS.GUSDC,
              amountIn,
              FEE_TIERS.LOW
            );
            inputUSD = new BigNumber(inQuote.outTokenAmount.toString());
          }
        }
      } catch (e) {
        // fall back to snapshot pricing below
        inputUSD = null;
      }

      if (outputUSD === null) try {
        if (tokenOutSymbol === 'USDC') {
          outputUSD = new BigNumber(amountOut);
        } else {
          const outClassKey = tokenOutSymbol === 'GALA' ? COMMON_TOKENS.GALA
                             : tokenOutSymbol === 'USDT' ? COMMON_TOKENS.GUSDT
                             : tokenOutSymbol === 'ETH' ? COMMON_TOKENS.GETH
                             : tokenOutSymbol === 'WBTC' ? COMMON_TOKENS.GWBTC
                             : undefined;
          if (outClassKey) {
            const outQuote = await this.gswap.quoting.quoteExactInput(
              outClassKey,
              COMMON_TOKENS.GUSDC,
              amountOut,
              FEE_TIERS.LOW
            );
            outputUSD = new BigNumber(outQuote.outTokenAmount.toString());
          }
        }
      } catch (e) {
        // fall back to snapshot pricing below
        outputUSD = null;
      }

      // If direct valuation failed for either side, fall back to snapshot prices
      if (inputUSD === null || outputUSD === null) {
        const tokenPrices = snapshotPrices;
        const inputPrice = tokenPrices[tokenInSymbol] || 0;
        const outputPrice = tokenPrices[tokenOutSymbol] || 0;

        // If we don't have price data for either token, show exchange rate
        if (inputPrice === 0 || outputPrice === 0) {
          const inputAmount = new BigNumber(amountIn);
          const outputAmount = new BigNumber(amountOut);
          const exchangeRate = outputAmount.dividedBy(inputAmount);
          return { 
            absolute: `${exchangeRate.toFixed(6)} ${tokenOutSymbol}/${tokenInSymbol}`, 
            percentage: 'N/A'
          };
        }

        const inputAmount = new BigNumber(amountIn);
        const outputAmount = new BigNumber(amountOut);
        inputUSD = inputUSD ?? inputAmount.multipliedBy(inputPrice);
        outputUSD = outputUSD ?? outputAmount.multipliedBy(outputPrice);
      }
      
      // At this point we have inputUSD and outputUSD
      const inputUSDVal = inputUSD as BigNumber;
      const outputUSDVal = outputUSD as BigNumber;
      
      // Debug logging
      this.logger.debug(`PnL Calculation Debug:`, {
        tokenIn: tokenInSymbol,
        tokenOut: tokenOutSymbol,
        amountIn: amountIn,
        amountOut: amountOut,
        inputUSD: inputUSDVal.toString(),
        outputUSD: outputUSDVal.toString()
      });
      
      // Get GALA price for gas estimation (fallback included)
      const tokenPrices = await this.getTokenPrices();
      
      // If we don't have price data for either token, show exchange rate
      if (!inputUSDVal || !outputUSDVal) {
        const inputAmount = new BigNumber(amountIn);
        const outputAmount = new BigNumber(amountOut);
        const exchangeRate = outputAmount.dividedBy(inputAmount);
        return { 
          absolute: `${exchangeRate.toFixed(6)} ${tokenOutSymbol}/${tokenInSymbol}`, 
          percentage: 'N/A'
        };
      }
      
      // Calculate gas fee in USD (1 GALA per transaction)
      const gasFeeGALA = new BigNumber(1);
      const gasFeeUSD = gasFeeGALA.multipliedBy(tokenPrices['GALA'] || 0.0153);
      
      // Calculate PnL including gas fees
      const pnlUSD = outputUSDVal.minus(inputUSDVal).minus(gasFeeUSD);
      const pnlPercentage = inputUSDVal.isZero() ? 0 : pnlUSD.dividedBy(inputUSDVal).multipliedBy(100);
      
      // Format the results
      const pnlSign = pnlUSD.isPositive() ? '+' : '';
      const pnlDisplay = `${pnlSign}$${pnlUSD.toFixed(4)}`;
      const percentageDisplay = `${pnlSign}${pnlPercentage.toFixed(2)}%`;
      
      return { 
        absolute: pnlDisplay, 
        percentage: percentageDisplay
      };
      
    } catch (error) {
      this.logger.warn('Failed to calculate PnL', error);
      return { absolute: 'N/A', percentage: 'N/A' };
    }
  }
}
