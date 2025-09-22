# Cicada Bot - Web Interface 

A modern, responsive web interface for the Cicada Bot that allows you to execute token swaps through your browser.

## Features

- **Token Swapping**: Execute GALA ↔ USDC swaps with real-time quotes
- **Portfolio Management**: View your token balances and positions
- **Real-time Pricing**: Get current market prices and price impact
- **Transaction History**: Track your recent trading activity
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Settings Management**: Configure API endpoints and preferences

## Quick Start

1. **Install Dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the Web Server**:
   ```bash
   npm run web
   ```

3. **Open Your Browser**:
   Navigate to `http://localhost:3001`

## Available Commands

- `npm run web` - Start the web server
- `npm run web:dev` - Start with auto-reload (requires nodemon)
- `npm run web:build` - Build and run the production version

## Web Interface Features

### Trading Panel
- Select input and output tokens
- Enter swap amounts
- Configure slippage tolerance
- Choose fee tiers (0.05%, 0.30%, 1.00%)
- Get real-time quotes
- Execute swaps with confirmation

### Portfolio Panel
- View token balances
- Refresh portfolio data
- Real-time balance updates

### Transaction History
- Track recent swaps
- View transaction hashes
- Monitor trading activity

### Settings
- Configure API base URL
- Set log levels
- Save preferences locally

## API Endpoints

The web server provides the following REST API endpoints:

- `GET /api/health` - Health check
- `GET /api/status` - Bot connection status
- `POST /api/quote` - Get swap quote
- `POST /api/swap` - Execute token swap
- `GET /api/portfolio` - Get portfolio summary
- `GET /api/balance/:tokenClassKey` - Get specific token balance
- `GET /api/price/:tokenIn/:tokenOut` - Get current price
- `GET /api/tokens` - Get available tokens and fee tiers

## Configuration

The web interface uses the same configuration as the main bot:

- Environment variables from `.env` file
- Private key and wallet address
- Gateway URL settings
- Log level configuration

## Security Notes

- The web interface runs locally and connects to your bot instance
- Private keys are handled by the bot backend, not exposed to the frontend
- All API calls are made to localhost by default
- Use HTTPS in production environments

## Troubleshooting

### Connection Issues
- Ensure the bot is properly configured with valid credentials
- Check that the API server is running on the correct port
- Verify your `.env` file has the correct settings

### Quote/Swap Failures
- Check your token balances
- Verify slippage tolerance settings
- Ensure sufficient liquidity in the selected pools

### Portfolio Loading Issues
- The portfolio API may return errors if the wallet is empty
- Check the bot logs for detailed error information

## Development

To modify the web interface:

1. Edit files in the `web/` directory
2. Use `npm run web:dev` for auto-reload during development
3. The interface uses vanilla JavaScript, HTML, and CSS
4. No build process required for frontend changes

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

Requires modern browser with ES6+ support.
