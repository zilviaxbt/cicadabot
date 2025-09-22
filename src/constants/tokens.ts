// Common GalaChain token class keys
export const COMMON_TOKENS = {
  GALA: 'GALA|Unit|none|none',
  GUSDC: 'GUSDC|Unit|none|none',
  GETH: 'GETH|Unit|none|none',
  GUSDT: 'GUSDT|Unit|none|none',
  GWBTC: 'GWBTC|Unit|none|none',
} as const;

// Fee tiers available on GalaSwap
export const FEE_TIERS = {
  LOW: 500,    // 0.05%
  MEDIUM: 3000, // 0.30%
  HIGH: 10000,  // 1.00%
} as const;

// Default slippage tolerance (0.5%)
export const DEFAULT_SLIPPAGE = 0.5;

// Token symbols for display
export const TOKEN_SYMBOLS: Record<string, string> = {
  'GALA|Unit|none|none': 'GALA',
  'GUSDC|Unit|none|none': 'USDC',
  'GETH|Unit|none|none': 'ETH',
  'GUSDT|Unit|none|none': 'USDT',
  'GWBTC|Unit|none|none': 'WBTC',
};

export function getTokenSymbol(tokenClassKey: string): string {
  return TOKEN_SYMBOLS[tokenClassKey] || tokenClassKey.split('|')[0] || 'UNKNOWN';
}
