const express = require('express');
const path = require('path');
const cors = require('cors');
const { CicadaBot } = require('../dist/src/CicadaBot');
const { loadConfig, validateConfig } = require('../dist/src/utils/config');
const { Logger } = require('../dist/src/utils/logger');
const { COMMON_TOKENS, FEE_TIERS } = require('../dist/src/constants/tokens');

class WebServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.bot = null;
        this.isInitialized = false;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeBot();
    }

    setupMiddleware() {
        // Enable CORS for all routes
        this.app.use(cors());
        
        // Parse JSON bodies
        this.app.use(express.json());
        
        // Serve static files from the web directory
        this.app.use(express.static(path.join(__dirname)));
        
        // Logging middleware
        this.app.use((req, res, next) => {
            Logger.info(`${req.method} ${req.path}`, { 
                ip: req.ip, 
                userAgent: req.get('User-Agent') 
            });
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                botInitialized: this.isInitialized 
            });
        });

        // Bot status endpoint
        this.app.get('/api/status', (req, res) => {
            if (!this.bot) {
                return res.json({ 
                    connected: false, 
                    error: 'Bot not initialized' 
                });
            }

            const status = this.bot.getStatus();
            res.json({
                connected: status.connected,
                walletAddress: status.walletAddress,
                errorCount: status.errorCount,
                lastActivity: status.lastActivity
            });
        });

        // Get quote endpoint
        this.app.post('/api/quote', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { tokenIn, tokenOut, amountIn, slippageTolerance, feeTier } = req.body;

                if (!tokenIn || !tokenOut || !amountIn) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Missing required parameters' 
                    });
                }

                Logger.info('Getting quote via API', { tokenIn, tokenOut, amountIn });

                const quote = await this.bot.getQuote({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance: slippageTolerance || 0.5,
                    feeTier: feeTier || FEE_TIERS.LOW
                });

                res.json({
                    success: true,
                    quote
                });

            } catch (error) {
                Logger.error('Quote API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Execute swap endpoint
        this.app.post('/api/swap', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { tokenIn, tokenOut, amountIn, slippageTolerance, feeTier } = req.body;

                if (!tokenIn || !tokenOut || !amountIn) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Missing required parameters' 
                    });
                }

                Logger.info('Executing swap via API', { tokenIn, tokenOut, amountIn });

                const result = await this.bot.executeSwap({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance: slippageTolerance || 1.0,
                    feeTier: feeTier || FEE_TIERS.LOW
                });

                res.json({
                    success: result.success,
                    result: result.success ? result : null,
                    error: result.success ? null : result.error
                });

            } catch (error) {
                Logger.error('Swap API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Get portfolio endpoint
        this.app.get('/api/portfolio', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Getting portfolio via API');

                const portfolio = await this.bot.getPortfolioSummary();
                
                res.json({
                    success: true,
                    portfolio: portfolio.tokens || [],
                    positions: portfolio.positions || [],
                    totalTokens: portfolio.totalTokens || 0
                });

            } catch (error) {
                Logger.error('Portfolio API error', error);
                // Return empty portfolio instead of error for better UX
                res.json({
                    success: true,
                    portfolio: [],
                    positions: [],
                    totalTokens: 0,
                    message: 'Portfolio data unavailable (wallet might be empty)'
                });
            }
        });

        // Get token balance endpoint
        this.app.get('/api/balance/:tokenClassKey', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { tokenClassKey } = req.params;
                Logger.info('Getting token balance via API', { tokenClassKey });

                const balance = await this.bot.getTokenBalance(tokenClassKey);
                
                res.json({
                    success: true,
                    balance
                });

            } catch (error) {
                Logger.error('Balance API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Get current price endpoint
        this.app.get('/api/price/:tokenIn/:tokenOut', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { tokenIn, tokenOut } = req.params;
                const { feeTier } = req.query;
                
                Logger.info('Getting current price via API', { tokenIn, tokenOut, feeTier });

                const price = await this.bot.getCurrentPrice(tokenIn, tokenOut, feeTier ? parseInt(feeTier) : undefined);
                
                res.json({
                    success: true,
                    price
                });

            } catch (error) {
                Logger.error('Price API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Lunar Strategy Endpoints
        this.app.get('/api/lunar/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const currentStrategy = this.bot.getCurrentStrategy();
                const isLunarRunning = currentStrategy && currentStrategy.constructor.name === 'LunarPhaseStrategy' && currentStrategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isLunarRunning,
                    strategy: isLunarRunning ? 'LunarPhaseStrategy' : null,
                    resultsCount: isLunarRunning ? this.bot.getArbitrageResults().length : 0
                });

            } catch (error) {
                Logger.error('Lunar status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get lunar status' 
                });
            }
        });

        this.app.get('/api/lunar/phase', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                // Get current lunar phase information
                const currentStrategy = this.bot.getCurrentStrategy();
                if (currentStrategy && 'getCurrentLunarPhase' in currentStrategy) {
                    const phaseInfo = currentStrategy.getCurrentLunarPhase();
                    res.json({
                        success: true,
                        phaseInfo
                    });
                } else {
                    // Calculate lunar phase even if no strategy is running
                    const { LunarPhaseStrategy } = require('../src/strategies/LunarPhaseStrategy');
                    const mockBot = { addArbitrageResult: () => {} };
                    const tempStrategy = new LunarPhaseStrategy(mockBot, {});
                    const phaseInfo = tempStrategy.getCurrentLunarPhase();
                    
                    res.json({
                        success: true,
                        phaseInfo
                    });
                }

            } catch (error) {
                Logger.error('Lunar phase API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get lunar phase' 
                });
            }
        });

        this.app.get('/api/lunar/position', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const currentStrategy = this.bot.getCurrentStrategy();
                if (currentStrategy && 'getCurrentPosition' in currentStrategy) {
                    const position = currentStrategy.getCurrentPosition();
                    res.json({
                        success: true,
                        position
                    });
                } else {
                    res.json({
                        success: true,
                        position: null
                    });
                }

            } catch (error) {
                Logger.error('Lunar position API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get lunar position' 
                });
            }
        });

        // Arbitrage Strategy Endpoints
        this.app.get('/api/arbitrage/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const currentStrategy = this.bot.getCurrentStrategy();
                // Only show as running if it's an actual arbitrage strategy (not Prime or Lunar) and is actually running
                const isArbitrageRunning = currentStrategy && 
                    !['PrimeCicadaStrategy', 'LunarPhaseStrategy'].includes(currentStrategy.constructor.name) &&
                    currentStrategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isArbitrageRunning,
                    strategy: isArbitrageRunning ? currentStrategy.constructor.name : null,
                    resultsCount: isArbitrageRunning ? this.bot.getArbitrageResults().length : 0
                });

            } catch (error) {
                Logger.error('Arbitrage status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get arbitrage status' 
                });
            }
        });

        this.app.post('/api/arbitrage/start', async (req, res) => {
            try {
                if (!this.bot || !this.isInitialized) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized. Please configure your .env file with PRIVATE_KEY and WALLET_ADDRESS' 
                    });
                }

                const { strategy, config } = req.body;
                Logger.info('Starting arbitrage strategy via API', { strategy, config });

                const result = await this.bot.startArbitrageStrategy(strategy, config);
                
                res.json({
                    success: true,
                    message: `Arbitrage strategy '${strategy}' started successfully`,
                    ...result
                });

            } catch (error) {
                Logger.error('Start arbitrage API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to start arbitrage strategy' 
                });
            }
        });

        this.app.post('/api/arbitrage/stop', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Stopping arbitrage strategy via API');

                const result = await this.bot.stopArbitrageStrategy();
                
                res.json({
                    success: true,
                    message: 'Arbitrage strategy stopped successfully',
                    ...result
                });

            } catch (error) {
                Logger.error('Stop arbitrage API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to stop arbitrage strategy' 
                });
            }
        });

        this.app.post('/api/arbitrage/reset', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Resetting arbitrage strategy via API');

                const currentStrategy = this.bot.getCurrentStrategy();
                if (currentStrategy && typeof currentStrategy.reset === 'function') {
                    currentStrategy.reset();
                    
                    res.json({
                        success: true,
                        message: 'Strategy reset successfully'
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        error: 'Current strategy does not support reset functionality'
                    });
                }

            } catch (error) {
                Logger.error('Reset arbitrage API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to reset strategy' 
                });
            }
        });

        this.app.get('/api/arbitrage/results', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const results = this.bot.getArbitrageResults();
                Logger.info('📊 API returning arbitrage results:', {
                    resultCount: results.length,
                    results: results.map(r => ({ type: r.type, amount: r.amount, profit: r.profitPercentage }))
                });
                
                res.json({
                    success: true,
                    results
                });

            } catch (error) {
                Logger.error('Arbitrage results API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get arbitrage results' 
                });
            }
        });

        this.app.get('/api/arbitrage/strategy-status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const currentStrategy = this.bot.getCurrentStrategy();
                if (currentStrategy && typeof currentStrategy.getStatus === 'function') {
                    const strategyStatus = currentStrategy.getStatus();
                    
                    res.json({
                        success: true,
                        ...strategyStatus
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        error: 'No strategy running or strategy does not support status reporting'
                    });
                }

            } catch (error) {
                Logger.error('Get strategy status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to get strategy status' 
                });
            }
        });

        // Prime Cicada Strategy Endpoints
        this.app.get('/api/prime/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const currentStrategy = this.bot.getCurrentStrategy();
                const isPrimeRunning = currentStrategy && currentStrategy.constructor.name === 'PrimeCicadaStrategy' && currentStrategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isPrimeRunning,
                    strategy: isPrimeRunning ? 'PrimeCicadaStrategy' : null,
                    resultsCount: isPrimeRunning ? this.bot.getArbitrageResults().length : 0
                });

            } catch (error) {
                Logger.error('Prime status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get prime status' 
                });
            }
        });

        // Pool Shark Endpoints
        this.app.post('/api/token-swap/start', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { config } = req.body;
                Logger.info('Starting Pool Shark via API', config);

                await this.bot.startArbitrageStrategy('token-swap', config);
                
                res.json({
                    success: true,
                    message: 'Pool Shark started successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark start API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to start Pool Shark' 
                });
            }
        });

        this.app.post('/api/token-swap/stop', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Stopping Pool Shark via API');
                await this.bot.stopArbitrageStrategy('token-swap');
                
                res.json({
                    success: true,
                    message: 'Pool Shark stopped successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark stop API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to stop Pool Shark' 
                });
            }
        });

        this.app.get('/api/token-swap/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const tokenSwapStrategy = this.bot.getStrategy('token-swap');
                const isTokenSwapRunning = tokenSwapStrategy !== null && tokenSwapStrategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isTokenSwapRunning,
                    strategy: isTokenSwapRunning ? 'TokenSwapStrategy' : null,
                    resultsCount: isTokenSwapRunning ? this.bot.getArbitrageResults().filter(r => r.type && r.type.includes('Pool Shark')).length : 0
                });

            } catch (error) {
                Logger.error('Pool Shark status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get Pool Shark status' 
                });
            }
        });

        // Pool Shark 2 Endpoints
        this.app.post('/api/token-swap-2/start', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { config } = req.body;
                Logger.info('Starting Pool Shark 2 via API', config);

                await this.bot.startArbitrageStrategy('token-swap-2', config);
                
                res.json({
                    success: true,
                    message: 'Pool Shark 2 started successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 2 start API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to start Pool Shark 2' 
                });
            }
        });

        this.app.post('/api/token-swap-2/stop', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Stopping Pool Shark 2 via API');
                await this.bot.stopArbitrageStrategy('token-swap-2');
                
                res.json({
                    success: true,
                    message: 'Pool Shark 2 stopped successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 2 stop API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to stop Pool Shark 2' 
                });
            }
        });

        this.app.get('/api/token-swap-2/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const tokenSwap2Strategy = this.bot.getStrategy('token-swap-2');
                const isTokenSwap2Running = tokenSwap2Strategy !== null && tokenSwap2Strategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isTokenSwap2Running,
                    strategy: isTokenSwap2Running ? 'TokenSwap2Strategy' : null,
                    resultsCount: isTokenSwap2Running ? this.bot.getArbitrageResults().filter(r => r.type && r.type.includes('Pool Shark 2')).length : 0
                });

            } catch (error) {
                Logger.error('Pool Shark 2 status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get Pool Shark 2 status' 
                });
            }
        });

        // Pool Shark 3 Endpoints
        this.app.post('/api/token-swap-3/start', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { config } = req.body;
                Logger.info('Starting Pool Shark 3 via API', config);

                await this.bot.startArbitrageStrategy('token-swap-3', config);
                
                res.json({
                    success: true,
                    message: 'Pool Shark 3 started successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 3 start API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to start Pool Shark 3' 
                });
            }
        });

        this.app.post('/api/token-swap-3/stop', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Stopping Pool Shark 3 via API');
                await this.bot.stopArbitrageStrategy('token-swap-3');
                
                res.json({
                    success: true,
                    message: 'Pool Shark 3 stopped successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 3 stop API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to stop Pool Shark 3' 
                });
            }
        });

        this.app.get('/api/token-swap-3/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const tokenSwap3Strategy = this.bot.getStrategy('token-swap-3');
                const isTokenSwap3Running = tokenSwap3Strategy !== null && tokenSwap3Strategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isTokenSwap3Running,
                    strategy: isTokenSwap3Running ? 'TokenSwap3Strategy' : null,
                    resultsCount: isTokenSwap3Running ? this.bot.getArbitrageResults().filter(r => r.type && r.type.includes('Pool Shark 3')).length : 0
                });

            } catch (error) {
                Logger.error('Pool Shark 3 status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get Pool Shark 3 status' 
                });
            }
        });

        // Pool Shark 4 Endpoints
        this.app.post('/api/token-swap-4/start', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { config } = req.body;
                Logger.info('Starting Pool Shark 4 via API', config);

                await this.bot.startArbitrageStrategy('token-swap-4', config);
                
                res.json({
                    success: true,
                    message: 'Pool Shark 4 started successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 4 start API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to start Pool Shark 4' 
                });
            }
        });

        this.app.post('/api/token-swap-4/stop', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Stopping Pool Shark 4 via API');
                await this.bot.stopArbitrageStrategy('token-swap-4');
                
                res.json({
                    success: true,
                    message: 'Pool Shark 4 stopped successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 4 stop API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to stop Pool Shark 4' 
                });
            }
        });

        this.app.get('/api/token-swap-4/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const tokenSwap4Strategy = this.bot.getStrategy('token-swap-4');
                const isTokenSwap4Running = tokenSwap4Strategy !== null && tokenSwap4Strategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isTokenSwap4Running,
                    strategy: isTokenSwap4Running ? 'TokenSwap4Strategy' : null,
                    resultsCount: isTokenSwap4Running ? this.bot.getArbitrageResults().filter(r => r.type && r.type.includes('Pool Shark 4')).length : 0
                });

            } catch (error) {
                Logger.error('Pool Shark 4 status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get Pool Shark 4 status' 
                });
            }
        });

        // Pool Shark 5 Endpoints
        this.app.post('/api/token-swap-5/start', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { config } = req.body;
                Logger.info('Starting Pool Shark 5 via API', config);

                await this.bot.startArbitrageStrategy('token-swap-5', config);
                
                res.json({
                    success: true,
                    message: 'Pool Shark 5 started successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 5 start API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to start Pool Shark 5' 
                });
            }
        });

        this.app.post('/api/token-swap-5/stop', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                Logger.info('Stopping Pool Shark 5 via API');
                await this.bot.stopArbitrageStrategy('token-swap-5');
                
                res.json({
                    success: true,
                    message: 'Pool Shark 5 stopped successfully'
                });

            } catch (error) {
                Logger.error('Pool Shark 5 stop API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Failed to stop Pool Shark 5' 
                });
            }
        });

        this.app.get('/api/token-swap-5/status', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const tokenSwap5Strategy = this.bot.getStrategy('token-swap-5');
                const isTokenSwap5Running = tokenSwap5Strategy !== null && tokenSwap5Strategy.isRunning;
                
                res.json({
                    success: true,
                    isRunning: isTokenSwap5Running,
                    strategy: isTokenSwap5Running ? 'TokenSwap5Strategy' : null,
                    resultsCount: isTokenSwap5Running ? this.bot.getArbitrageResults().filter(r => r.type && r.type.includes('Pool Shark 5')).length : 0
                });

            } catch (error) {
                Logger.error('Pool Shark 5 status API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get Pool Shark 5 status' 
                });
            }
        });

        // Get available tokens endpoint
        this.app.get('/api/tokens', (req, res) => {
            res.json({
                success: true,
                tokens: COMMON_TOKENS,
                feeTiers: FEE_TIERS
            });
        });

        // Get transaction history endpoint
        this.app.get('/api/transactions', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { limit = 50 } = req.query;
                Logger.info('Getting transaction history via API', { limit });

                const transactions = this.bot.getTransactionHistory(parseInt(limit));
                
                res.json({
                    success: true,
                    transactions,
                    count: transactions.length
                });

            } catch (error) {
                Logger.error('Transaction history API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get transaction history' 
                });
            }
        });

        // Get specific transaction endpoint
        this.app.get('/api/transactions/:id', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { id } = req.params;
                Logger.info('Getting transaction by ID via API', { id });

                const transaction = this.bot.getTransaction(id);
                
                if (!transaction) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Transaction not found' 
                    });
                }
                
                res.json({
                    success: true,
                    transaction
                });

            } catch (error) {
                Logger.error('Get transaction API error', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to get transaction' 
                });
            }
        });

        // Recalculate PnL for a transaction (or latest if none provided)
        this.app.post('/api/transactions/recalculate', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ 
                        success: false, 
                        error: 'Bot not initialized' 
                    });
                }

                const { id } = req.body || {};
                const updated = await this.bot.recalculateTransaction(id);
                if (!updated) {
                    return res.status(404).json({ success: false, error: 'Transaction not found' });
                }
                res.json({ success: true, transaction: updated });
            } catch (error) {
                Logger.error('Recalculate transaction API error', error);
                res.status(500).json({ success: false, error: 'Failed to recalculate transaction' });
            }
        });

        // Recalculate PnL for all transactions
        this.app.post('/api/transactions/recalculate-all', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ success: false, error: 'Bot not initialized' });
                }
                const updated = await this.bot.recalculateAllTransactions();
                res.json({ success: true, updated });
            } catch (error) {
                Logger.error('Recalculate all transactions API error', error);
                res.status(500).json({ success: false, error: 'Failed to recalculate transactions' });
            }
        });

        // Recalculate PnL for transactions within the last N hours
        this.app.post('/api/transactions/recalculate-since', async (req, res) => {
            try {
                if (!this.bot) {
                    return res.status(500).json({ success: false, error: 'Bot not initialized' });
                }
                const hoursParam = (req.query.hours || req.body?.hours || 10);
                const hours = parseFloat(hoursParam);
                if (isNaN(hours) || hours < 0) {
                    return res.status(400).json({ success: false, error: 'Invalid hours parameter' });
                }
                const updated = await this.bot.recalculateTransactionsSince(hours);
                res.json({ success: true, updated, hours });
            } catch (error) {
                Logger.error('Recalculate recent transactions API error', error);
                res.status(500).json({ success: false, error: 'Failed to recalculate recent transactions' });
            }
        });

        // Serve the main HTML file for all other routes (SPA routing)
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            Logger.error('Unhandled server error', error);
            res.status(500).json({ 
                success: false, 
                error: 'Internal server error' 
            });
        });
    }

    async initializeBot() {
        try {
            Logger.info('Initializing GalaSwap bot for web server...');
            
            // Load configuration
            const config = loadConfig();
            
            // Check if we have the required configuration
            if (!config.privateKey || !config.walletAddress) {
                Logger.warn('Bot configuration incomplete. Please set up your .env file with PRIVATE_KEY and WALLET_ADDRESS');
                Logger.warn('The web interface will be available but trading features will be disabled');
                this.isInitialized = false;
                return;
            }
            
            validateConfig(config);
            
            // Initialize bot
            this.bot = new CicadaBot(config);
            await this.bot.initialize();
            
            this.isInitialized = true;
            Logger.info('Bot initialized successfully for web server');
            
        } catch (error) {
            Logger.error('Failed to initialize bot for web server', error);
            Logger.warn('The web interface will be available but trading features will be disabled');
            this.isInitialized = false;
        }
    }

    async start() {
        try {
            this.app.listen(this.port, () => {
                Logger.info(`Cicada Bot Web Server running on http://localhost:${this.port}`);
                Logger.info('Open your browser and navigate to the URL above to access the Cicada Bot trading interface');
            });
        } catch (error) {
            Logger.error('Failed to start web server', error);
            process.exit(1);
        }
    }

    async stop() {
        try {
            if (this.bot) {
                await this.bot.disconnect();
            }
            Logger.info('Web server stopped');
        } catch (error) {
            Logger.error('Error stopping web server', error);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    Logger.info('Received SIGINT, shutting down gracefully...');
    if (global.webServer) {
        await global.webServer.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    Logger.info('Received SIGTERM, shutting down gracefully...');
    if (global.webServer) {
        await global.webServer.stop();
    }
    process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
    const server = new WebServer();
    global.webServer = server;
    server.start().catch((error) => {
        Logger.error('Failed to start web server', error);
        process.exit(1);
    });
}

module.exports = WebServer;
