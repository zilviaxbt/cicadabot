cicadabot -  idk ai wrote the readme and stuff i just thought cicadas using prime numbers to stay alive was kinda cool. mostly does prime number intervals but has lunar cycle arbritrage functions as well as that was the original idea. 

<img width="1070" height="1259" alt="image" src="https://github.com/user-attachments/assets/984230b9-567a-4469-86ae-a77fd07da106" />

<img width="1066" height="1241" alt="image" src="https://github.com/user-attachments/assets/8f9b983c-a1ea-4314-8ca8-e71939f954ae" />

<img width="1092" height="950" alt="image" src="https://github.com/user-attachments/assets/771b68d9-eca5-439a-bcdf-5d0099079c86" />

An advanced TypeScript trading bot for GalaSwap DEX with a unique **prime interval trading strategy** inspired by periodical cicadas. The bot trades on prime number intervals (3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79 minutes), alternating between buying and selling tokens at each interval - much like how periodical cicadas emerge in prime number cycles.

## Features

- **🦗 Prime Interval Trading**: The core strategy - trades on prime number intervals inspired by periodical cicadas
- **Token Swapping**: Execute exact input/output swaps with slippage protection
- **Price Quoting**: Get accurate pricing across multiple fee tiers
- **Portfolio Management**: Monitor token balances and liquidity positions
- **Real-time Monitoring**: Socket-based transaction status monitoring
- **Advanced Arbitrage**: Automated arbitrage opportunities across fee tiers
- **🌙 Lunar Phase Trading**: Trade based on moon phases and lunar cycles (legacy feature, may not work as expected)
- **Interactive Trading**: Menu-driven interface for manual trading
- **Automated Strategies**: Prime interval, arbitrage, and lunar strategies
- **Error Handling**: Comprehensive error handling and logging
- **TypeScript Support**: Full type safety and IntelliSense support

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cicada-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Edit `.env` file with your configuration:
```env
PRIVATE_KEY=your_private_key_here
WALLET_ADDRESS=eth|your_wallet_address_here
LOG_LEVEL=info
```

## Configuration

### Required Environment Variables

- `PRIVATE_KEY`: Your private key (hex format, without 0x prefix)
- `WALLET_ADDRESS`: Your wallet address (eth| format)

### Optional Environment Variables

- `GATEWAY_BASE_URL`: Custom gateway URL (defaults to mainnet)
- `TRANSACTION_WAIT_TIMEOUT_MS`: Transaction timeout in milliseconds (default: 300000)
- `LOG_LEVEL`: Log level (error, warn, info, debug)

## Usage

### Basic Usage

```typescript
import { CicadaBot } from './src/CicadaBot';
import { loadConfig, validateConfig } from './src/utils/config';
import { COMMON_TOKENS, FEE_TIERS } from './src/constants/tokens';

async function main() {
  // Load configuration
  const config = loadConfig();
  validateConfig(config);
  
  // Initialize bot
  const bot = new CicadaBot(config);
  await bot.initialize();
  
  // Get a quote
  const quote = await bot.getQuote({
    tokenIn: COMMON_TOKENS.GALA,
    tokenOut: COMMON_TOKENS.GUSDC,
    amountIn: '100',
    slippageTolerance: 0.5,
    feeTier: FEE_TIERS.LOW
  });
  
  console.log(`Quote: 100 GALA → ${quote.amountOut} USDC`);
  
  // Execute swap
  const result = await bot.executeSwap({
    tokenIn: COMMON_TOKENS.GALA,
    tokenOut: COMMON_TOKENS.GUSDC,
    amountIn: '100',
    slippageTolerance: 0.5
  });
  
  if (result.success) {
    console.log('Swap successful!', result.transactionHash);
  }
  
  // Cleanup
  await bot.disconnect();
}
```

### Running Examples

1. **🦗 Prime Interval Strategy (Main Feature)**:
```bash
npm run prime
```

2. **Interactive Trading Script**:
```bash
npm run trading
```

3. **Advanced Arbitrage Bot**:
```bash
npm run arbitrage
```

4. **Automated Arbitrage (Conservative)**:
```bash
npm run auto-arbitrage:conservative
```

5. **Automated Arbitrage (Aggressive)**:
```bash
npm run auto-arbitrage:aggressive
```

6. **🌙 Lunar Phase Trading (Legacy)**:
```bash
npm run lunar
```

7. **Test Lunar Strategy**:
```bash
npm run test-lunar
```

8. **Basic Usage Example**:
```bash
npm run dev examples/basic-usage.ts
```

9. **Advanced Trading Example**:
```bash
npm run dev examples/advanced-trading.ts
```

## 🦗 Prime Interval Strategy (Main Feature)

The **Prime Cicada Strategy** is the core feature of this trading bot, inspired by the fascinating behavior of periodical cicadas that emerge in prime number cycles (13 or 17 years). The bot trades on prime number intervals in minutes, creating a unique and unpredictable trading pattern.

### How It Works

The strategy cycles through prime number intervals: **3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79 minutes**.

1. **Immediate Execution**: Executes the first swap immediately upon starting
2. **Prime Intervals**: Waits for the current prime number of minutes before the next swap
3. **Alternating Direction**: Alternates between buying and selling at each interval
4. **Percentage Trading**: Swaps a configurable percentage (default 33%) of the current balance
5. **Continuous Cycle**: Repeats through all prime intervals indefinitely

### Strategy Logic

- **Interval 1**: Wait 3 minutes → Buy GALA with USDC
- **Interval 2**: Wait 7 minutes → Sell GALA for USDC  
- **Interval 3**: Wait 11 minutes → Buy GALA with USDC
- **Interval 4**: Wait 13 minutes → Sell GALA for USDC
- And so on through all 20 prime numbers...

### Configuration Options

```typescript
const primeConfig: PrimeIntervalConfig = {
  tokenA: COMMON_TOKENS.GUSDC,    // USDC (default)
  tokenB: COMMON_TOKENS.GALA,     // GALA (default)
  slippageTolerance: 0.5,         // 0.5% slippage
  swapPercentage: 33,             // 33% of balance per swap
  feeTier: FEE_TIERS.LOW,         // 0.05% fee tier
  enabled: true
};
```

### Running the Prime Strategy

**Start Prime Interval Strategy:**
```bash
npm run prime
```

**Features:**
- Real-time prime interval monitoring
- Automatic buy/sell alternation
- Configurable swap percentages
- Multiple fee tier support
- Transaction history tracking
- Web interface monitoring

### Prime Strategy Example

```typescript
import { CicadaBot } from './src/CicadaBot';
import { PrimeCicadaStrategy } from './src/strategies/PrimeIntervalStrategy';

const bot = new CicadaBot(config);
await bot.initialize();

// Start the prime interval strategy
const strategyResult = await bot.startArbitrageStrategy('prime', {
  tokenA: COMMON_TOKENS.GUSDC,
  tokenB: COMMON_TOKENS.GALA,
  slippageTolerance: 0.5,
  swapPercentage: 33,
  feeTier: FEE_TIERS.LOW
});

console.log('Prime Cicada Strategy started:', strategyResult);
```

### Why Prime Numbers?

Just like periodical cicadas use prime number cycles to avoid synchronization with predators, this trading strategy uses prime intervals to create unpredictable trading patterns that may help avoid common market timing patterns and reduce correlation with typical trading behaviors.

## Arbitrage Trading

The bot includes advanced arbitrage capabilities that can automatically detect and execute profitable trading opportunities across different fee tiers on GalaSwap.

### Arbitrage Strategy

The arbitrage bot monitors price differences between:
- **0.05% fee tier** (FEE_TIERS.LOW)
- **0.30% fee tier** (FEE_TIERS.MEDIUM) 
- **1.00% fee tier** (FEE_TIERS.HIGH)

### How It Works

1. **Price Monitoring**: Continuously scans all available fee tiers
2. **Opportunity Detection**: Identifies price differences that exceed minimum profit thresholds
3. **Risk Assessment**: Evaluates slippage and liquidity before execution
4. **Automated Execution**: Executes buy/sell pairs to capture arbitrage profits
5. **Profit Tracking**: Monitors actual vs expected profits

### Configuration Options

```typescript
const arbitrageConfig: ArbitrageConfig = {
  minProfitThreshold: 0.1,    // 0.1% minimum profit
  maxPositionSize: '100',     // Maximum 100 GALA per trade
  checkInterval: 10000,       // Check every 10 seconds
  maxSlippage: 1.0,          // 1% max slippage
  enabledTokens: ['GALA', 'USDC']
};
```

### Running Arbitrage Bots

**Interactive Arbitrage Bot:**
```bash
npm run arbitrage
```
- Menu-driven interface
- Manual opportunity scanning
- Configurable parameters
- Real-time opportunity display

**Automated Arbitrage (Conservative):**
```bash
npm run auto-arbitrage:conservative
```
- 0.05% minimum profit threshold
- 50 GALA max position size
- 15-second check intervals
- 0.5% max slippage

**Automated Arbitrage (Aggressive):**
```bash
npm run auto-arbitrage:aggressive
```
- Lower profit thresholds
- Larger position sizes
- Faster execution
- Higher risk tolerance

### Arbitrage Example

```typescript
import { ArbitrageStrategy } from './src/strategies/ArbitrageStrategy';

const strategy = new ArbitrageStrategy(bot, {
  minProfitThreshold: 0.1,
  maxPositionSize: '100',
  checkInterval: 10000,
  maxSlippage: 1.0,
  enabledTokens: ['GALA', 'USDC']
});

await strategy.start();
```

## 🌙 Lunar Phase Trading (Legacy Feature)

**Note**: The lunar phase trading strategy is a legacy feature that may not work exactly as expected. The main focus of this bot is the Prime Interval Strategy above.

The bot includes a unique lunar phase trading strategy that trades based on moon phases and lunar cycles. This strategy follows the hypothesis that lunar cycles may influence market sentiment and price movements.

### Lunar Phase Strategy

The lunar trading bot monitors moon phases and executes trades based on:

- **New Moon**: Buy signal (bullish sentiment)
- **Full Moon**: Sell signal (bearish sentiment)  
- **Waxing Moon**: Gradual buying pressure
- **Waning Moon**: Gradual selling pressure

### How It Works

1. **Lunar Phase Calculation**: Uses astronomical algorithms to calculate current moon phase
2. **Signal Generation**: Generates buy/sell signals based on lunar phase and proximity to major phases
3. **Risk Management**: Implements stop-loss, take-profit, and position sizing
4. **Automated Execution**: Executes trades when signal confidence exceeds threshold
5. **Position Management**: Monitors and closes positions based on price targets or time limits

### Configuration Options

```typescript
const lunarConfig: LunarPhaseConfig = {
  minTradeAmount: '10',           // Minimum trade amount
  maxTradeAmount: '50',           // Maximum trade amount
  checkInterval: 300000,          // Check every 5 minutes
  maxSlippage: 0.5,               // 0.5% slippage tolerance
  enabledTokens: ['GALA', 'USDC'], // Trade GALA/USDC pair
  strategy: 'both',               // Use both new moon buy and full moon sell
  phaseThreshold: 2,              // Trade within 2 days of major phases
  riskManagement: {
    stopLossPercentage: 5,        // 5% stop loss
    takeProfitPercentage: 10,     // 10% take profit
    maxPositionSize: 20           // Max 20% of balance per position
  }
};
```

### Strategy Types

- **`new-moon-buy`**: Only buy during new moon phases
- **`full-moon-sell`**: Only sell during full moon phases
- **`both`**: Use both new moon buy and full moon sell signals

### Running Lunar Trading Bot

**Lunar Phase Trading:**
```bash
npm run lunar
```

Features:
- Real-time lunar phase monitoring
- Automated trade execution based on moon phases
- Risk management with stop-loss and take-profit
- Position tracking and management
- Multiple strategy configurations

### Lunar Strategy Examples

**Conservative Strategy:**
```typescript
const conservativeConfig = {
  minTradeAmount: '5',
  maxTradeAmount: '25',
  checkInterval: 600000, // 10 minutes
  strategy: 'both',
  phaseThreshold: 1, // Only trade within 1 day of major phases
  riskManagement: {
    stopLossPercentage: 3,
    takeProfitPercentage: 8,
    maxPositionSize: 10
  }
};
```

**Aggressive Strategy:**
```typescript
const aggressiveConfig = {
  minTradeAmount: '20',
  maxTradeAmount: '100',
  checkInterval: 180000, // 3 minutes
  strategy: 'both',
  phaseThreshold: 3, // Trade within 3 days of major phases
  riskManagement: {
    stopLossPercentage: 8,
    takeProfitPercentage: 15,
    maxPositionSize: 30
  }
};
```

### Lunar Trading Example

```typescript
import { LunarPhaseStrategy } from './src/strategies/LunarPhaseStrategy';

const strategy = new LunarPhaseStrategy(bot, {
  minTradeAmount: '10',
  maxTradeAmount: '50',
  checkInterval: 300000,
  maxSlippage: 0.5,
  enabledTokens: ['GALA', 'USDC'],
  strategy: 'both',
  phaseThreshold: 2,
  riskManagement: {
    stopLossPercentage: 5,
    takeProfitPercentage: 10,
    maxPositionSize: 20
  }
});

await strategy.start();
```

## API Reference

### CicadaBot Class

#### Constructor
```typescript
new CicadaBot(config: BotConfig)
```

#### Methods

##### `initialize(): Promise<void>`
Initialize the bot and connect to event socket.

##### `getQuote(params: SwapParams): Promise<QuoteResult>`
Get a quote for a token swap.

##### `executeSwap(params: SwapParams): Promise<SwapResult>`
Execute a token swap transaction.

##### `getPortfolioSummary(): Promise<PortfolioSummary>`
Get user's portfolio summary including tokens and positions.

##### `getTokenBalance(tokenClassKey: string): Promise<string>`
Get balance for a specific token.

##### `getCurrentPrice(tokenIn: string, tokenOut: string, feeTier?: number): Promise<string>`
Get current price for a token pair.

##### `getStatus(): BotStatus`
Get current bot status.

##### `disconnect(): Promise<void>`
Disconnect and cleanup resources.

### Types

#### SwapParams
```typescript
interface SwapParams {
  tokenIn: string;           // Input token class key
  tokenOut: string;          // Output token class key
  amountIn: string;          // Amount to swap
  slippageTolerance?: number; // Slippage tolerance (default: 0.5%)
  feeTier?: number;          // Fee tier (500, 3000, or 10000)
}
```

#### SwapResult
```typescript
interface SwapResult {
  success: boolean;
  transactionHash?: string;
  amountIn: string;
  amountOut: string;
  priceImpact?: string;
  feeTier?: number;
  error?: string;
}
```

## Common Tokens

The bot includes predefined constants for common tokens:

```typescript
import { COMMON_TOKENS } from './src/constants/tokens';

// Available tokens
COMMON_TOKENS.GALA   // 'GALA|Unit|none|none'
COMMON_TOKENS.GUSDC  // 'GUSDC|Unit|none|none'
COMMON_TOKENS.GETH   // 'GETH|Unit|none|none'
COMMON_TOKENS.GUSDT  // 'GUSDT|Unit|none|none'
COMMON_TOKENS.GWBTC  // 'GWBTC|Unit|none|none'
```

## Fee Tiers

```typescript
import { FEE_TIERS } from './src/constants/tokens';

FEE_TIERS.LOW    // 500 (0.05%)
FEE_TIERS.MEDIUM // 3000 (0.30%)
FEE_TIERS.HIGH   // 10000 (1.00%)
```

## Error Handling

The bot includes comprehensive error handling:

```typescript
try {
  const result = await bot.executeSwap(params);
  if (!result.success) {
    console.error('Swap failed:', result.error);
  }
} catch (error) {
  console.error('Bot error:', error);
}
```

## Logging

The bot uses Winston for logging with configurable levels:

```typescript
// Set log level in .env
LOG_LEVEL=debug

// Logs are written to:
// - Console (colored output)
// - logs/error.log (error level)
// - logs/combined.log (all levels)
```

## Development

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## Safety Considerations

1. **Private Key Security**: Never commit your private key to version control
2. **Test with Small Amounts**: Always test with small amounts first
3. **Slippage Protection**: Use appropriate slippage tolerance
4. **Error Handling**: Always handle errors gracefully
5. **Rate Limiting**: Be mindful of API rate limits

## Troubleshooting

### Common Issues

1. **"No Signer Error"**: Ensure PRIVATE_KEY is set correctly
2. **"Invalid Wallet Address"**: Ensure WALLET_ADDRESS starts with "eth|"
3. **"Socket Connection Required"**: Bot automatically connects, but check network connectivity
4. **"Pool Not Found"**: Try different fee tiers or check token addresses

### Debug Mode

Enable debug logging for detailed information:

```bash
LOG_LEVEL=debug npm run dev src/index.ts
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the GalaSwap SDK documentation
3. Open an issue on GitHub
