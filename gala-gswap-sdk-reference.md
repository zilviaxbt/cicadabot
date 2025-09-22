# Gala Chain GSwap SDK Reference

## Overview

The @gala-chain/gswap-sdk is a comprehensive TypeScript/JavaScript SDK for
interacting with GSwap, a decentralized exchange built on the Gala Chain. This
SDK provides a complete suite of tools for trading tokens, managing liquidity
positions, retrieving market data, and handling real-time transaction updates.
The SDK is designed to work in both Node.js and browser environments with full
TypeScript support.

**Version:** 0.0.7  
**Package:** `@gala-chain/gswap-sdk`  
**License:** Apache-2.0

### Key Features

- **Token Swapping**: Execute exact input/output swaps with slippage protection
- **Liquidity Management**: Create, modify, and manage concentrated liquidity
  positions
- **Price Quoting**: Get accurate pricing across multiple fee tiers
- **Real-time Updates**: Socket-based transaction status monitoring
- **Asset Management**: Retrieve user token balances and portfolio data
- **Multi-environment**: Works in Node.js, browsers, and React applications
- **Full TypeScript Support**: Complete type definitions for all operations

## Installation & Setup

```bash
npm install @gala-chain/gswap-sdk
```

### Basic Setup

```typescript
import { GSwap, PrivateKeySigner } from '@gala-chain/gswap-sdk';

// Read-only operations (no signer required)
const gswap = new GSwap();

// For transactions (signer required)
const gswapWithSigner = new GSwap({
  signer: new PrivateKeySigner('your-private-key'),
  walletAddress: 'eth|your-wallet-address',
});
```

### Configuration Options

```typescript
const gswap = new GSwap({
  signer: new PrivateKeySigner('private-key'),
  gatewayBaseUrl: 'https://gateway-mainnet.galachain.com',
  dexContractBasePath: '/api/asset/dexv3-contract',
  tokenContractBasePath: '/api/asset/token-contract',
  bundlerBaseUrl: 'https://bundle-backend-prod1.defi.gala.com',
  bundlingAPIBasePath: '/bundle',
  dexBackendBaseUrl: 'https://dex-backend-prod1.defi.gala.com',
  transactionWaitTimeoutMs: 300000, // 5 minutes
  walletAddress: 'eth|your-default-wallet',
  httpRequestor: fetch, // Custom HTTP requestor
});
```

## Core Modules

### Module: GSwap (Main SDK Class)

**File**: `src/classes/gswap.ts` **Description**: Primary interface for all
GSwap operations. Orchestrates trading, liquidity management, and data
retrieval.

#### Classes

##### GSwap

- **Description**: Main SDK class that provides access to all GSwap
  functionality
- **Constructor**: `constructor(options?: GSwapOptions)`
- **Properties**:
  - `quoting: Quoting` - Price discovery and quote operations
  - `positions: Positions` - Liquidity position management
  - `swaps: Swaps` - Token swap operations
  - `assets: Assets` - User asset and balance queries
  - `pools: Pools` - Pool data and calculations
  - `events: Events` (static) - Real-time event streaming
- **Configuration Options**:
  - `signer?: GalaChainSigner` - Transaction signer (required for writes)
  - `gatewayBaseUrl?: string` - GalaChain Gateway URL
  - `walletAddress?: string` - Default wallet for operations
  - `transactionWaitTimeoutMs?: number` - Transaction timeout
  - `httpRequestor?: HttpRequestor` - Custom HTTP client

**Example Usage**:

```typescript
// Initialize SDK
const gswap = new GSwap({
  signer: new PrivateKeySigner('your-private-key'),
  walletAddress: 'eth|123...abc',
});

// Get token balance
const assets = await gswap.assets.getUserAssets('eth|123...abc');

// Execute a swap
const swapResult = await gswap.swaps.swap(
  'GALA|Unit|none|none',
  'GUSDC|Unit|none|none',
  500, // 0.05% fee tier
  { exactIn: '100', amountOutMinimum: '45' }
);
```

### Module: Quoting

**File**: `src/classes/quoting.ts` **Description**: Handles price discovery and
trade impact analysis across different fee tiers.

#### Functions

##### quoteExactInput

- **Signature**:
  `quoteExactInput(tokenIn: GalaChainTokenClassKey | string, tokenOut: GalaChainTokenClassKey | string, amountIn: NumericAmount, fee?: FEE_TIER): Promise<GetQuoteResult>`
- **Description**: Gets a quote for selling an exact amount of input tokens
- **Parameters**:
  - `tokenIn` (GalaChainTokenClassKey | string): Token to sell
  - `tokenOut` (GalaChainTokenClassKey | string): Token to buy
  - `amountIn` (NumericAmount): Exact amount to sell
  - `fee` (FEE_TIER, optional): Pool fee tier (if not specified, finds best
    across all tiers)
- **Returns**: Quote with expected output amount and price impact
- **Example Usage**:

```typescript
// Get best quote across all fee tiers
const quote = await gswap.quoting.quoteExactInput(
  'GALA|Unit|none|none',
  'GUSDC|Unit|none|none',
  '100'
);
console.log(`Selling 100 GALA will get ${quote.outTokenAmount} USDC`);
console.log(`Price impact: ${quote.priceImpact}%`);
```

##### quoteExactOutput

- **Signature**:
  `quoteExactOutput(tokenIn: GalaChainTokenClassKey | string, tokenOut: GalaChainTokenClassKey | string, amountOut: NumericAmount, fee?: FEE_TIER): Promise<GetQuoteResult>`
- **Description**: Gets a quote for buying an exact amount of output tokens
- **Parameters**:
  - `tokenIn` (GalaChainTokenClassKey | string): Token to sell
  - `tokenOut` (GalaChainTokenClassKey | string): Token to buy
  - `amountOut` (NumericAmount): Exact amount to buy
  - `fee` (FEE_TIER, optional): Pool fee tier
- **Returns**: Quote with required input amount and price impact
- **Example Usage**:

```typescript
// Find out how much GALA needed to buy 50 USDC
const quote = await gswap.quoting.quoteExactOutput(
  'GALA|Unit|none|none',
  'GUSDC|Unit|none|none',
  '50'
);
console.log(`Need ${quote.inTokenAmount} GALA to buy 50 USDC`);
```

### Module: Swaps

**File**: `src/classes/swaps.ts` **Description**: Executes token swap
transactions on the DEX.

#### Functions

##### swap

- **Signature**:
  `swap(tokenIn: GalaChainTokenClassKey | string, tokenOut: GalaChainTokenClassKey | string, fee: number, amount: SwapAmount, walletAddress?: string): Promise<PendingTransaction>`
- **Description**: Executes a token swap transaction
- **Parameters**:
  - `tokenIn` (GalaChainTokenClassKey | string): Input token to sell
  - `tokenOut` (GalaChainTokenClassKey | string): Output token to buy
  - `fee` (number): Pool fee tier (500, 3000, or 10000)
  - `amount` (SwapAmount): Swap parameters (exact input or exact output)
    - For exact input: `{ exactIn: string, amountOutMinimum?: string }`
    - For exact output: `{ exactOut: string, amountInMaximum?: string }`
  - `walletAddress` (string, optional): Wallet executing the swap
- **Returns**: PendingTransaction object for monitoring completion
- **Throws**: GSwapSDKError for validation failures or execution errors
- **Example Usage**:

```typescript
// Exact input swap: sell 100 GALA for USDC
const result = await gswap.swaps.swap(
  'GALA|Unit|none|none',
  'GUSDC|Unit|none|none',
  500, // 0.05% fee
  {
    exactIn: '100',
    amountOutMinimum: '45', // slippage protection
  },
  'eth|your-wallet-address'
);

// Wait for transaction completion
const completed = await result.wait();
console.log('Swap completed:', completed.transactionHash);
```

### Module: Positions

**File**: `src/classes/positions.ts` **Description**: Comprehensive liquidity
position management with concentrated liquidity support.

#### Functions

##### getUserPositions

- **Signature**:
  `getUserPositions(ownerAddress: string, limit?: number, bookmark?: string): Promise<{bookmark: string, positions: GetUserPositionsResult[]}>`
- **Description**: Retrieves all liquidity positions for a wallet
- **Parameters**:
  - `ownerAddress` (string): Wallet address to query
  - `limit` (number, optional): Maximum positions to return
  - `bookmark` (string, optional): Pagination bookmark
- **Returns**: Array of positions with pagination bookmark
- **Example Usage**:

```typescript
const result = await gswap.positions.getUserPositions('eth|123...abc');
console.log(`Found ${result.positions.length} positions`);
result.positions.forEach((pos) => {
  console.log(
    `${pos.token0Symbol}/${pos.token1Symbol} - Fee: ${pos.fee / 100}%`
  );
});
```

##### getPosition

- **Signature**:
  `getPosition(ownerAddress: string, position: PositionParams): Promise<GetPositionResult>`
- **Description**: Gets detailed information about a specific position
- **Parameters**:
  - `ownerAddress` (string): Position owner
  - `position` (PositionParams): Position identifier
    - `token0ClassKey` (string): First token
    - `token1ClassKey` (string): Second token
    - `fee` (number): Fee tier
    - `tickLower` (number): Lower tick boundary
    - `tickUpper` (number): Upper tick boundary
- **Returns**: Detailed position data including liquidity and fees
- **Example Usage**:

```typescript
const position = await gswap.positions.getPosition('eth|123...abc', {
  token0ClassKey: 'GALA|Unit|none|none',
  token1ClassKey: 'GUSDC|Unit|none|none',
  fee: 500,
  tickLower: -6000,
  tickUpper: 6000,
});
console.log(`Liquidity: ${position.liquidity}`);
console.log(`Fees owed: ${position.tokensOwed0}, ${position.tokensOwed1}`);
```

##### addLiquidityByPrice

- **Signature**:
  `addLiquidityByPrice(params: AddLiquidityByPriceParams): Promise<PendingTransaction>`
- **Description**: Adds liquidity to a position using price range specification
- **Parameters**:
  - `params` (AddLiquidityByPriceParams): Liquidity parameters
    - `walletAddress` (string): User wallet
    - `positionId` (string): Position ID (empty for new position)
    - `token0`, `token1` (string): Token pair
    - `fee` (number): Fee tier
    - `tickSpacing` (number): Tick spacing
    - `minPrice`, `maxPrice` (string): Price range
    - `amount0Desired`, `amount1Desired` (string): Desired amounts
    - `amount0Min`, `amount1Min` (string): Minimum amounts (slippage)
- **Returns**: PendingTransaction for monitoring
- **Example Usage**:

```typescript
const result = await gswap.positions.addLiquidityByPrice({
  walletAddress: 'eth|123...abc',
  positionId: '', // new position
  token0: 'GALA|Unit|none|none',
  token1: 'GUSDC|Unit|none|none',
  fee: 500,
  tickSpacing: 10,
  minPrice: '0.45',
  maxPrice: '0.55',
  amount0Desired: '100',
  amount1Desired: '50',
  amount0Min: '95',
  amount1Min: '47.5',
});
```

##### addLiquidityByTicks

- **Signature**:
  `addLiquidityByTicks(params: AddLiquidityByTicksParams): Promise<PendingTransaction>`
- **Description**: Adds liquidity using precise tick boundaries
- **Parameters**: Similar to addLiquidityByPrice but uses `tickLower` and
  `tickUpper` instead of price range
- **Returns**: PendingTransaction for monitoring

##### removeLiquidity

- **Signature**:
  `removeLiquidity(params: RemoveLiquidityParams): Promise<PendingTransaction>`
- **Description**: Removes liquidity from a position
- **Parameters**:
  - `walletAddress` (string): User wallet
  - `positionId` (string): Position to modify
  - `liquidity` (string): Amount of liquidity to remove
  - `amount0Min`, `amount1Min` (string): Minimum amounts to receive
- **Returns**: PendingTransaction for monitoring

##### collectFees

- **Signature**:
  `collectFees(params: CollectFeesParams): Promise<PendingTransaction>`
- **Description**: Collects accumulated fees from a position
- **Parameters**:
  - `walletAddress` (string): User wallet
  - `positionId` (string): Position to collect from
  - `amount0Max`, `amount1Max` (string): Maximum amounts to collect
- **Returns**: PendingTransaction for monitoring

##### estimateRemoveLiquidity

- **Signature**:
  `estimateRemoveLiquidity(params: EstimateRemoveLiquidityParams): Promise<{amount0: BigNumber, amount1: BigNumber}>`
- **Description**: Estimates token amounts that would be received when removing
  liquidity
- **Parameters**:
  - `positionId` (string): Position to estimate
  - `liquidity` (string): Liquidity amount to remove
- **Returns**: Estimated token amounts
- **Example Usage**:

```typescript
const estimate = await gswap.positions.estimateRemoveLiquidity({
  positionId: 'position-hash',
  liquidity: '1000000',
});
console.log(
  `Would receive: ${estimate.amount0} token0, ${estimate.amount1} token1`
);
```

### Module: Assets

**File**: `src/classes/assets.ts` **Description**: Manages user token balances
and asset information.

#### Functions

##### getUserAssets

- **Signature**:
  `getUserAssets(ownerAddress: string, page: number = 1, limit: number = 10): Promise<GetUserAssetsResult>`
- **Description**: Retrieves all tokens owned by a user with their balances
- **Parameters**:
  - `ownerAddress` (string): Wallet address to query
  - `page` (number): Page number for pagination (default: 1)
  - `limit` (number): Items per page, max 100 (default: 10)
- **Returns**: Array of user tokens with metadata and balances
- **Throws**: Error for invalid page or limit parameters
- **Example Usage**:

```typescript
const assets = await gswap.assets.getUserAssets('eth|123...abc', 1, 20);
console.log(`User has ${assets.count} different tokens`);
assets.tokens.forEach((token) => {
  console.log(
    `${token.symbol}: ${token.quantity} (${token.decimals} decimals)`
  );
  console.log(`Verified: ${token.verify}, Image: ${token.image}`);
});
```

### Module: Pools

**File**: `src/classes/pools.ts` **Description**: Provides pool data retrieval
and price calculation utilities.

#### Functions

##### getPoolData

- **Signature**:
  `getPoolData(token0: GalaChainTokenClassKey | string, token1: GalaChainTokenClassKey | string, fee: number): Promise<GetPoolDataResponse>`
- **Description**: Retrieves comprehensive data for a specific pool
- **Parameters**:
  - `token0`, `token1` (string): Token pair
  - `fee` (number): Pool fee tier
- **Returns**: Complete pool state including liquidity, prices, and fees
- **Example Usage**:

```typescript
const poolData = await gswap.pools.getPoolData(
  'GALA|Unit|none|none',
  'GUSDC|Unit|none|none',
  500
);
console.log(`Pool liquidity: ${poolData.liquidity}`);
console.log(`Current sqrt price: ${poolData.sqrtPrice}`);
console.log(
  `Fee growth: ${poolData.feeGrowthGlobal0}, ${poolData.feeGrowthGlobal1}`
);
```

##### calculateTicksForPrice

- **Signature**:
  `calculateTicksForPrice(price: PriceIn, tickSpacing: number): number`
- **Description**: Converts a price to the nearest valid tick
- **Parameters**:
  - `price` (PriceIn): Price to convert
  - `tickSpacing` (number): Pool's tick spacing
- **Returns**: Nearest valid tick value
- **Example Usage**:

```typescript
const tick = gswap.pools.calculateTicksForPrice('0.5', 10);
console.log(`Price 0.5 corresponds to tick: ${tick}`);
```

##### calculatePriceForTicks

- **Signature**: `calculatePriceForTicks(tick: number): Price`
- **Description**: Converts a tick to its corresponding price
- **Parameters**:
  - `tick` (number): Tick value to convert
- **Returns**: Corresponding price
- **Example Usage**:

```typescript
const price = gswap.pools.calculatePriceForTicks(-6000);
console.log(`Tick -6000 corresponds to price: ${price}`);
```

##### calculateSpotPrice

- **Signature**:
  `calculateSpotPrice(inToken: GalaChainTokenClassKey | string, outToken: GalaChainTokenClassKey | string, sqrtPrice: SqrtPriceIn): Price`
- **Description**: Calculates current spot price from sqrt price
- **Parameters**:
  - `inToken` (string): Input token
  - `outToken` (string): Output token
  - `sqrtPrice` (SqrtPriceIn): Pool's sqrt price
- **Returns**: Current spot price (outToken per inToken)

### Module: Events

**File**: `src/classes/events.ts` **Description**: Manages real-time event
streaming and transaction monitoring via WebSocket connections.

#### Static Instance

- **Property**: `Events.instance` - Singleton event manager

#### Functions

##### connectEventSocket

- **Signature**:
  `connectEventSocket(bundlerBaseUrl?: string): Promise<TradeEventEmitter>`
- **Description**: Establishes global socket connection for real-time updates
- **Parameters**:
  - `bundlerBaseUrl` (string, optional): Custom bundler URL
- **Returns**: Connected event emitter
- **Example Usage**:

```typescript
// Connect to event socket
await GSwap.events.connectEventSocket();
console.log('Connected:', GSwap.events.eventSocketConnected());

// Now transactions can be monitored in real-time
```

##### disconnectEventSocket

- **Signature**: `disconnectEventSocket(): void`
- **Description**: Disconnects the socket and cleans up resources
- **Example Usage**:

```typescript
GSwap.events.disconnectEventSocket();
```

##### eventSocketConnected

- **Signature**: `eventSocketConnected(): boolean`
- **Description**: Checks if socket connection is active
- **Returns**: Connection status

##### wait

- **Signature**:
  `wait(txId: string): Promise<{txId: string; transactionHash: string; Data: Record<string, unknown>}>`
- **Description**: Waits for a specific transaction to complete
- **Parameters**:
  - `txId` (string): Transaction ID to monitor
- **Returns**: Transaction completion data
- **Throws**: GSwapSDKError if socket not connected
- **Example Usage**:

```typescript
// Wait for transaction completion
const result = await GSwap.events.wait('transaction-id');
console.log(
  `Transaction ${result.txId} completed with hash: ${result.transactionHash}`
);
```

## Signing and Authentication

### GalaChainSigner (Interface)

**File**: `src/classes/signers.ts` **Description**: Base interface for
transaction signing implementations.

#### Interface Methods

- **signObject**:
  `signObject<T>(methodName: string, object: T): Promise<T & { signature: string }>`

### PrivateKeySigner

**File**: `src/classes/signers.ts` **Description**: Signs transactions using a
private key for server-side applications.

#### Constructor

- **Signature**: `constructor(privateKey: string)`
- **Parameters**:
  - `privateKey` (string): Hex-encoded private key

#### Example Usage

```typescript
const signer = new PrivateKeySigner('0x1234567890abcdef...');
const gswap = new GSwap({ signer });
```

### GalaWalletSigner

**File**: `src/classes/signers.ts` **Description**: Signs transactions using
browser-based Gala Wallet for client-side applications.

#### Constructor

- **Signature**: `constructor(walletAddress: string)`
- **Parameters**:
  - `walletAddress` (string): User's wallet address

#### Example Usage

```typescript
const signer = new GalaWalletSigner('eth|user-wallet-address');
const gswap = new GSwap({ signer });

// Requires globalThis.gala.wallet in browser environment
```

## Utility Functions

### Token Utilities

**File**: `src/utils/token.ts`

#### stringifyTokenClassKey

- **Signature**:
  `stringifyTokenClassKey(tokenClassKey: GalaChainTokenClassKey | string, separator = '|'): string`
- **Description**: Converts token class key object to string format
- **Example Usage**:

```typescript
const tokenString = stringifyTokenClassKey({
  collection: 'GALA',
  category: 'Unit',
  type: 'none',
  additionalKey: 'none',
});
// Result: "GALA|Unit|none|none"
```

#### parseTokenClassKey

- **Signature**:
  `parseTokenClassKey(tokenClassKey: string | GalaChainTokenClassKey): GalaChainTokenClassKey`
- **Description**: Parses string token key to object format
- **Example Usage**:

```typescript
const tokenObj = parseTokenClassKey('GALA|Unit|none|none');
// Result: { collection: 'GALA', category: 'Unit', type: 'none', additionalKey: 'none' }
```

#### compareTokens

- **Signature**:
  `compareTokens(first: GalaChainTokenClassKey | string, second: GalaChainTokenClassKey | string): number`
- **Description**: Compares two tokens for sorting/ordering
- **Returns**: -1, 0, or 1 for comparison result

#### getTokenOrdering

- **Signature**:
  `getTokenOrdering<T>(first: string, second: string, assertCorrectness: boolean, token1Data?: T, token2Data?: T)`
- **Description**: Determines canonical ordering for token pairs
- **Returns**: Ordered token pair with associated data

### Validation Utilities

**File**: `src/utils/validation.ts`

#### validateNumericAmount

- **Signature**:
  `validateNumericAmount(amount: NumericAmount, parameterName: string, allowZero = false): void`
- **Description**: Validates numeric inputs for amounts
- **Throws**: GSwapSDKError for invalid amounts

#### validateWalletAddress

- **Signature**:
  `validateWalletAddress(address?: string): asserts address is string`
- **Description**: Validates wallet address format
- **Throws**: GSwapSDKError for missing or invalid addresses

#### validateFee

- **Signature**: `validateFee(fee: number): void`
- **Description**: Validates fee tier values
- **Throws**: GSwapSDKError for unsupported fee tiers

#### validateTickRange

- **Signature**: `validateTickRange(tickLower: number, tickUpper: number): void`
- **Description**: Validates tick range boundaries
- **Throws**: GSwapSDKError for invalid tick ranges

#### validatePriceValues

- **Signature**:
  `validatePriceValues(spotPrice: NumericAmount, lowerPrice: NumericAmount, upperPrice: NumericAmount): void`
- **Description**: Validates price range consistency
- **Throws**: GSwapSDKError for invalid price relationships

## Type Definitions Reference

### Core Types

#### GalaChainTokenClassKey

```typescript
interface GalaChainTokenClassKey {
  collection: string; // Token collection (e.g., "GALA")
  category: string; // Token category (e.g., "Unit")
  type: string; // Token type (e.g., "none")
  additionalKey: string; // Additional identifier (e.g., "none")
}
```

#### NumericAmount

```typescript
type NumericAmount = string | number | BigNumber;
```

#### Price Types

```typescript
type Price = Brand<BigNumber, 'Price'>;
type PriceIn = Brand<NumericAmount, 'PriceIn'> | Price;
type SqrtPrice = Brand<BigNumber, 'SqrtPrice'>;
type SqrtPriceIn = Brand<NumericAmount, 'SqrtPriceIn'> | SqrtPrice;
```

### Fee Tiers

```typescript
enum FEE_TIER {
  PERCENT_00_05 = 500, // 0.05% fee
  PERCENT_00_30 = 3000, // 0.30% fee
  PERCENT_01_00 = 10000, // 1.00% fee
}
```

### Result Types

#### GetQuoteResult

```typescript
interface GetQuoteResult {
  amount0: BigNumber; // Raw token0 amount
  amount1: BigNumber; // Raw token1 amount
  currentPoolSqrtPrice: SqrtPrice; // Current pool sqrt price
  newPoolSqrtPrice: SqrtPrice; // New sqrt price after trade
  inTokenAmount: BigNumber; // Input token amount
  outTokenAmount: BigNumber; // Output token amount
  currentPrice: Price; // Current pool price
  newPrice: Price; // New price after trade
  priceImpact: BigNumber; // Price impact percentage
  feeTier: number; // Fee tier used
}
```

#### GetUserPositionsResult

```typescript
interface GetUserPositionsResult {
  poolHash: string; // Pool identifier
  positionId: string; // Position identifier
  token0ClassKey: GalaChainTokenClassKey; // First token
  token1ClassKey: GalaChainTokenClassKey; // Second token
  token0Img: string; // Token0 image URL
  token1Img: string; // Token1 image URL
  token0Symbol: string; // Token0 symbol
  token1Symbol: string; // Token1 symbol
  fee: number; // Pool fee tier
  liquidity: BigNumber; // Position liquidity
  tickLower: number; // Lower tick boundary
  tickUpper: number; // Upper tick boundary
  createdAt: string; // Creation timestamp
}
```

#### GetPositionResult

```typescript
interface GetPositionResult {
  fee: number; // Pool fee tier
  feeGrowthInside0Last: BigNumber; // Fee growth token0
  feeGrowthInside1Last: BigNumber; // Fee growth token1
  liquidity: BigNumber; // Position liquidity
  poolHash: string; // Pool identifier
  positionId: string; // Position identifier
  tickLower: number; // Lower tick
  tickUpper: number; // Upper tick
  token0ClassKey: GalaChainTokenClassKey; // First token
  token1ClassKey: GalaChainTokenClassKey; // Second token
  tokensOwed0: BigNumber; // Fees owed token0
  tokensOwed1: BigNumber; // Fees owed token1
}
```

#### UserAsset

```typescript
interface UserAsset {
  image: string; // Token image URL
  name: string; // Token name
  decimals: number; // Token decimals
  verify: boolean; // Verification status
  symbol: string; // Token symbol
  quantity: string; // User balance
}
```

#### GetUserAssetsResult

```typescript
interface GetUserAssetsResult {
  tokens: UserAsset[]; // Array of user tokens
  count: number; // Total token count
}
```

## Error Types & Handling

### GSwapSDKError

**File**: `src/classes/gswap_sdk_error.ts` **Description**: Standardized error
class for all SDK operations.

#### Constructor

- **Signature**:
  `constructor(message: string, code: string, details?: Record<string, unknown>)`

#### Properties

- `message: string` - Human-readable error description
- `code: string` - Machine-readable error code
- `details?: Record<string, unknown>` - Additional error context

#### Common Error Codes

- `NO_SIGNER` - Signer required for transaction operations
- `VALIDATION_ERROR` - Input validation failure
- `HTTP_ERROR` - API request failure
- `OBJECT_NOT_FOUND` - Pool or position not found
- `CONFLICT` - Insufficient liquidity or similar conflicts
- `INVALID_TOKEN_CLASS_KEY` - Malformed token identifier
- `SOCKET_CONNECTION_REQUIRED` - Socket connection needed for operation

#### Static Factory Methods

- `noSignerError()` - Creates no signer error
- `fromErrorResponse(url, response)` - Creates error from HTTP response
- `noPoolAvailableError(tokenIn, tokenOut)` - Creates no pool available error
- `socketConnectionRequiredError()` - Creates socket connection required error

#### Example Usage

```typescript
try {
  await gswap.swaps.swap(tokenIn, tokenOut, fee, amount);
} catch (error) {
  if (error instanceof GSwapSDKError) {
    console.log(`Error ${error.code}: ${error.message}`);
    console.log('Details:', error.details);
  }
}
```

## Advanced Usage Patterns

### Complete Swap Workflow

```typescript
import { GSwap, PrivateKeySigner, FEE_TIER } from '@gala-chain/gswap-sdk';

async function completeSwapWorkflow() {
  // Initialize SDK
  const gswap = new GSwap({
    signer: new PrivateKeySigner('your-private-key'),
    walletAddress: 'eth|your-wallet',
  });

  // Connect to event socket for real-time updates
  await GSwap.events.connectEventSocket();

  try {
    // 1. Get quote first
    const quote = await gswap.quoting.quoteExactInput(
      'GALA|Unit|none|none',
      'GUSDC|Unit|none|none',
      '100'
    );

    console.log(`Expected output: ${quote.outTokenAmount}`);
    console.log(`Price impact: ${quote.priceImpact}%`);

    // 2. Execute swap with slippage protection
    const minOutput = quote.outTokenAmount.multipliedBy(0.99); // 1% slippage
    const swapResult = await gswap.swaps.swap(
      'GALA|Unit|none|none',
      'GUSDC|Unit|none|none',
      quote.feeTier,
      {
        exactIn: '100',
        amountOutMinimum: minOutput.toFixed(),
      }
    );

    // 3. Wait for completion
    const completed = await swapResult.wait();
    console.log('Swap completed:', completed.transactionHash);
  } catch (error) {
    console.error('Swap failed:', error);
  } finally {
    GSwap.events.disconnectEventSocket();
  }
}
```

### Liquidity Management Workflow

```typescript
async function manageLiquidity() {
  const gswap = new GSwap({
    signer: new PrivateKeySigner('your-private-key'),
    walletAddress: 'eth|your-wallet',
  });

  try {
    // 1. Check current positions
    const positions = await gswap.positions.getUserPositions('eth|your-wallet');
    console.log(`Current positions: ${positions.positions.length}`);

    // 2. Add liquidity to new position
    const addResult = await gswap.positions.addLiquidityByPrice({
      walletAddress: 'eth|your-wallet',
      positionId: '', // empty for new position
      token0: 'GALA|Unit|none|none',
      token1: 'GUSDC|Unit|none|none',
      fee: 500,
      tickSpacing: 10,
      minPrice: '0.45',
      maxPrice: '0.55',
      amount0Desired: '1000',
      amount1Desired: '500',
      amount0Min: '950',
      amount1Min: '475',
    });

    await addResult.wait();
    console.log('Liquidity added successfully');

    // 3. Later, collect fees
    const updatedPositions =
      await gswap.positions.getUserPositions('eth|your-wallet');
    const position = updatedPositions.positions[0];

    const collectResult = await gswap.positions.collectFees({
      walletAddress: 'eth|your-wallet',
      positionId: position.positionId,
      amount0Max: '999999999',
      amount1Max: '999999999',
    });

    await collectResult.wait();
    console.log('Fees collected');
  } catch (error) {
    console.error('Liquidity management failed:', error);
  }
}
```

### Portfolio Monitoring

```typescript
async function monitorPortfolio() {
  const gswap = new GSwap();

  try {
    // Get user assets
    const assets = await gswap.assets.getUserAssets('eth|user-wallet', 1, 50);
    console.log(`Portfolio contains ${assets.count} different tokens:`);

    assets.tokens.forEach((token) => {
      console.log(`${token.symbol}: ${token.quantity}`);
    });

    // Get user positions
    const positions = await gswap.positions.getUserPositions('eth|user-wallet');
    console.log(`Active liquidity positions: ${positions.positions.length}`);

    positions.positions.forEach((pos) => {
      console.log(
        `${pos.token0Symbol}/${pos.token1Symbol} - Fee: ${pos.fee / 100}%`
      );
    });

    // Get detailed position data for fee calculations
    for (const pos of positions.positions) {
      const detailed = await gswap.positions.getPosition('eth|user-wallet', {
        token0ClassKey: pos.token0ClassKey,
        token1ClassKey: pos.token1ClassKey,
        fee: pos.fee,
        tickLower: pos.tickLower,
        tickUpper: pos.tickUpper,
      });

      console.log(`Position ${pos.positionId}:`);
      console.log(
        `  Fees owed: ${detailed.tokensOwed0} ${pos.token0Symbol}, ${detailed.tokensOwed1} ${pos.token1Symbol}`
      );
    }
  } catch (error) {
    console.error('Portfolio monitoring failed:', error);
  }
}
```

### Real-time Transaction Monitoring

```typescript
async function monitorTransactions() {
  // Connect to event socket
  const eventClient = await GSwap.events.connectEventSocket();

  // Set up event listeners
  eventClient.on('transaction', (data) => {
    console.log('Transaction update:', data);

    if (data.status === 'completed') {
      console.log(`Transaction ${data.txId} completed successfully`);
    } else if (data.status === 'failed') {
      console.log(`Transaction ${data.txId} failed:`, data.error);
    }
  });

  // Example: Execute swap and monitor
  const gswap = new GSwap({
    signer: new PrivateKeySigner('your-private-key'),
  });

  const swapResult = await gswap.swaps.swap(
    'GALA|Unit|none|none',
    'GUSDC|Unit|none|none',
    500,
    { exactIn: '100', amountOutMinimum: '45' }
  );

  console.log(`Monitoring transaction: ${swapResult.txId}`);

  try {
    const completed = await swapResult.wait();
    console.log('Transaction completed:', completed);
  } catch (error) {
    console.error('Transaction failed:', error);
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### No Signer Error

```typescript
// Problem: Trying to execute transactions without a signer
const gswap = new GSwap(); // No signer provided
await gswap.swaps.swap(...); // Throws NO_SIGNER error

// Solution: Provide signer for transaction operations
const gswap = new GSwap({
  signer: new PrivateKeySigner('your-private-key')
});
```

#### Socket Connection Required

```typescript
// Problem: Waiting for transaction without socket connection
const result = await gswap.swaps.swap(...);
await result.wait(); // Throws SOCKET_CONNECTION_REQUIRED

// Solution: Connect socket before waiting
await GSwap.events.connectEventSocket();
const result = await gswap.swaps.swap(...);
await result.wait(); // Now works
```

#### Pool Not Found

```typescript
// Problem: Trying to quote/swap on non-existent pool
try {
  const quote = await gswap.quoting.quoteExactInput(tokenA, tokenB, '100', 500);
} catch (error) {
  if (error.code === 'OBJECT_NOT_FOUND') {
    // Solution: Try different fee tier or check token addresses
    const quote = await gswap.quoting.quoteExactInput(tokenA, tokenB, '100'); // Let SDK find best pool
  }
}
```

#### Validation Errors

```typescript
// Problem: Invalid input parameters
try {
  await gswap.quoting.quoteExactInput(tokenA, tokenB, '0'); // Zero amount
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.log('Validation failed:', error.details);
    // Solution: Check parameter requirements
  }
}
```

#### Transaction Timeouts

```typescript
// Problem: Transaction taking longer than timeout
const gswap = new GSwap({
  signer: new PrivateKeySigner('key'),
  transactionWaitTimeoutMs: 60000, // Increase timeout to 1 minute
});
```

### Best Practices

1. **Always use quotes before swapping** to understand price impact
2. **Connect event socket** before executing transactions for real-time
   monitoring
3. **Implement proper error handling** for all SDK operations
4. **Use slippage protection** in swap and liquidity operations
5. **Validate inputs** before making API calls
6. **Monitor gas costs** and transaction fees
7. **Handle network failures** gracefully with retries
8. **Disconnect event socket** when done to free resources

### Debug Logging

Enable debug logging to troubleshoot issues:

```bash
# Node.js
DEBUG=GSWAP_SDK node your-app.js

# Browser (console)
localStorage.debug = 'GSWAP_SDK'
```

---

**SDK Version:** 0.0.7  
**Generated:** 2025-09-07  
**Documentation Type:** LLM-Optimized Reference
