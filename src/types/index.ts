import BigNumber from 'bignumber.js';

export interface BotConfig {
  privateKey: string;
  walletAddress: string;
  gatewayBaseUrl?: string | undefined;
  transactionWaitTimeoutMs?: number | undefined;
  logLevel?: 'error' | 'warn' | 'info' | 'debug' | undefined;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageTolerance?: number; // Percentage (e.g., 0.5 for 0.5%)
  feeTier?: number; // 500, 3000, or 10000
}

export interface SwapResult {
  success: boolean;
  transactionHash?: string;
  amountIn: string;
  amountOut: string;
  priceImpact?: string;
  feeTier?: number;
  error?: string;
}

export interface QuoteResult {
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  feeTier: number;
  currentPrice: string;
  newPrice: string;
}

export interface PortfolioSummary {
  totalTokens: number;
  tokens: Array<{
    symbol: string;
    balance: string;
    decimals: number;
    verified: boolean;
  }>;
  positions: Array<{
    pair: string;
    fee: number;
    liquidity: string;
  }>;
}

export interface BotStatus {
  connected: boolean;
  walletAddress: string;
  lastActivity?: Date | undefined;
  errorCount: number;
}

export type TokenClassKey = string; // Format: "GALA|Unit|none|none"
export type NumericAmount = string | number | BigNumber;
