// GalaSwap Trading Bot Web Interface
class GalaSwapWebInterface {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001';
        this.isConnected = false;
        this.currentQuote = null;
        this.portfolio = [];
        this.transactions = [];
        this.isProcessingArbitrage = false; // Prevent double-clicks
        this.statusCheckInterval = null; // For periodic status checks
        
        this.initializeEventListeners();
        this.initializeArbitrageControls();
        this.initializeLunarControls();
        this.initializePrimeControls();
        this.initializeTokenSwapControls();
        this.initializeTokenSwap2Controls();
        this.checkConnection();
        this.loadSettings();
        this.loadTransactionHistory(); // Load transaction history from API
        
        // Start periodic status checks
        this.startStatusChecks();
    }

    initializeEventListeners() {
        // Quote button
        document.getElementById('getQuoteBtn').addEventListener('click', () => this.getQuote());
        
        // Execute swap button
        document.getElementById('executeSwapBtn').addEventListener('click', () => this.executeSwap());
        
        // Swap tokens button
        document.getElementById('swapTokens').addEventListener('click', () => this.swapTokens());
        
        // Max button
        document.getElementById('maxButton').addEventListener('click', () => this.setMaxAmount());
        
        // Refresh portfolio
        document.getElementById('refreshPortfolio').addEventListener('click', () => this.loadPortfolio());
        
        // Refresh transaction history
        document.getElementById('refreshTransactions').addEventListener('click', () => this.loadTransactionHistory());
        
        // Settings modal
        document.getElementById('showSettings').addEventListener('click', () => this.showSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('cancelSettings').addEventListener('click', () => this.hideSettings());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideSettings());
        
        // Logs
        document.getElementById('showLogs').addEventListener('click', () => this.showLogs());
        
        // Strategy Info Modal
        document.getElementById('showStrategyInfo').addEventListener('click', () => this.showStrategyInfo());
        document.getElementById('closeStrategyInfo').addEventListener('click', () => this.hideStrategyInfo());
        
        // Lunar Info Modal
        document.getElementById('showLunarInfo').addEventListener('click', () => this.showLunarInfo());
        document.getElementById('closeLunarInfo').addEventListener('click', () => this.hideLunarInfo());
        
        // Prime Info Modal
        document.getElementById('showPrimeInfo').addEventListener('click', () => this.showPrimeInfo());
        
        // Token Swap Info Modal
        document.getElementById('showTokenSwapInfo').addEventListener('click', () => this.showTokenSwapInfo());
        
        // Close button for prime info modal
        const primeInfoModal = document.getElementById('primeInfoModal');
        if (primeInfoModal) {
            const closeBtn = primeInfoModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hidePrimeInfo());
            }
        }
        
        // Close button for token swap info modal
        const tokenSwapInfoModal = document.getElementById('tokenSwapInfoModal');
        if (tokenSwapInfoModal) {
            const closeBtn = tokenSwapInfoModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideTokenSwapInfo());
            }
        }
        
        // Close button for strategy info modal
        const strategyInfoModal = document.getElementById('strategyInfoModal');
        if (strategyInfoModal) {
            const closeBtn = strategyInfoModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideStrategyInfo());
            }
        }
        
        // Modal backdrop clicks
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                this.hideSettings();
            }
        });
        
        document.getElementById('strategyInfoModal').addEventListener('click', (e) => {
            if (e.target.id === 'strategyInfoModal') {
                this.hideStrategyInfo();
            }
        });
        
        document.getElementById('lunarInfoModal').addEventListener('click', (e) => {
            if (e.target.id === 'lunarInfoModal') {
                this.hideLunarInfo();
            }
        });
        
        document.getElementById('primeInfoModal').addEventListener('click', (e) => {
            if (e.target.id === 'primeInfoModal') {
                this.hidePrimeInfo();
            }
        });
        
        document.getElementById('tokenSwapInfoModal').addEventListener('click', (e) => {
            if (e.target.id === 'tokenSwapInfoModal') {
                this.hideTokenSwapInfo();
            }
        });
        
        // Auto-refresh connection status
        setInterval(() => this.checkConnection(), 10000);
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/status`);
            const data = await response.json();
            
            this.isConnected = data.connected;
            this.updateConnectionStatus();
            
            if (this.isConnected) {
                this.loadPortfolio();
            }
        } catch (error) {
            this.isConnected = false;
            this.updateConnectionStatus();
        }
    }

    updateConnectionStatus() {
        const statusDot = document.getElementById('connectionStatus');
        const statusText = document.getElementById('connectionText');
        
        if (this.isConnected) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Connected';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Disconnected';
        }
    }

    async getQuote() {
        const tokenIn = document.getElementById('tokenIn').value;
        const tokenOut = document.getElementById('tokenOut').value;
        const amountIn = document.getElementById('amountIn').value;
        const slippage = document.getElementById('slippage').value;
        const feeTier = parseInt(document.getElementById('feeTier').value);

        if (!amountIn || parseFloat(amountIn) <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        this.showToast('Getting quote...', 'info');

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance: parseFloat(slippage),
                    feeTier
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentQuote = data.quote;
                this.displayQuote(data.quote);
                document.getElementById('executeSwapBtn').disabled = false;
                this.showToast('Quote received successfully', 'success');
            } else {
                this.showToast(`Quote failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`Error getting quote: ${error.message}`, 'error');
        }
    }

    displayQuote(quote) {
        document.getElementById('amountOut').textContent = quote.amountOut;
        document.getElementById('priceImpact').textContent = `${quote.priceImpact}%`;
        document.getElementById('currentPrice').textContent = quote.currentPrice;
        document.getElementById('newPrice').textContent = quote.newPrice;
        document.getElementById('quoteFeeTier').textContent = `${quote.feeTier} (${(quote.feeTier / 100).toFixed(2)}%)`;
        
        document.getElementById('quoteResults').style.display = 'block';
    }

    async executeSwap() {
        if (!this.currentQuote) {
            this.showToast('Please get a quote first', 'error');
            return;
        }

        const tokenIn = document.getElementById('tokenIn').value;
        const tokenOut = document.getElementById('tokenOut').value;
        const amountIn = document.getElementById('amountIn').value;
        const slippage = document.getElementById('slippage').value;
        const feeTier = parseInt(document.getElementById('feeTier').value);

        // Confirmation dialog
        const confirmMessage = `Execute swap: ${amountIn} ${this.getTokenSymbol(tokenIn)} → ${this.currentQuote.amountOut} ${this.getTokenSymbol(tokenOut)}?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        this.showToast('Executing swap...', 'info');

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance: parseFloat(slippage),
                    feeTier
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Swap executed successfully!', 'success');
                this.addTransaction({
                    type: 'Swap',
                    from: `${amountIn} ${this.getTokenSymbol(tokenIn)}`,
                    to: `${data.result.amountOut} ${this.getTokenSymbol(tokenOut)}`,
                    hash: data.result.transactionHash,
                    time: new Date().toLocaleString()
                });
                this.loadPortfolio();
                this.currentQuote = null;
                document.getElementById('executeSwapBtn').disabled = true;
                document.getElementById('quoteResults').style.display = 'none';
            } else {
                this.showToast(`Swap failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`Error executing swap: ${error.message}`, 'error');
        }
    }

    swapTokens() {
        const tokenIn = document.getElementById('tokenIn');
        const tokenOut = document.getElementById('tokenOut');
        const amountIn = document.getElementById('amountIn');
        
        // Swap token selections
        const tempValue = tokenIn.value;
        tokenIn.value = tokenOut.value;
        tokenOut.value = tempValue;
        
        // Clear amount and quote
        amountIn.value = '';
        this.currentQuote = null;
        document.getElementById('executeSwapBtn').disabled = true;
        document.getElementById('quoteResults').style.display = 'none';
    }

    setMaxAmount() {
        // This would typically get the user's balance for the selected token
        // For now, we'll set a reasonable default
        document.getElementById('amountIn').value = '100';
    }

    async loadPortfolio() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/portfolio`);
            const data = await response.json();

            if (data.success) {
                this.portfolio = data.portfolio;
                this.displayPortfolio(data.portfolio, data.totalTokens);
            } else {
                this.displayPortfolioError(data.error);
            }
        } catch (error) {
            this.displayPortfolioError('Failed to load portfolio');
        }
    }

    displayPortfolio(portfolio, totalTokens = 0) {
        const container = document.getElementById('portfolioContent');
        
        if (!portfolio || portfolio.length === 0) {
            container.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-wallet" style="font-size: 2rem; margin-bottom: 10px; color: #7877c6;"></i>
                    <div>No tokens found</div>
                    <div style="font-size: 0.8rem; margin-top: 5px; color: #7877c6;">
                        Your wallet appears to be empty or portfolio data is unavailable
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = portfolio.map(token => `
            <div class="portfolio-item">
                <div class="token-info">
                    <span class="token-symbol">${token.symbol}</span>
                    ${token.verified ? '<i class="fas fa-check-circle" style="color: #00ff88; margin-left: 5px;"></i>' : ''}
                </div>
                <div class="token-balance">${parseFloat(token.balance).toFixed(6)}</div>
            </div>
        `).join('');
    }

    displayPortfolioError(error) {
        const container = document.getElementById('portfolioContent');
        container.innerHTML = `<div class="loading">Error loading portfolio: ${error}</div>`;
    }

    async loadTransactionHistory() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/transactions?limit=20`);
            const result = await response.json();

            if (result.success) {
                this.transactions = result.transactions || [];
                this.displayTransactions();
            } else {
                this.displayTransactionError(result.error);
            }
        } catch (error) {
            console.error('Failed to load transaction history:', error);
            this.displayTransactionError('Failed to load transaction history');
        }
    }

    displayTransactions() {
        const container = document.getElementById('transactionsContent');
        
        if (this.transactions.length === 0) {
            container.innerHTML = '<div class="no-transactions">No recent transactions</div>';
            return;
        }

        container.innerHTML = this.transactions.map(tx => `
            <div class="transaction-item">
                <div class="transaction-header">
                    <span class="transaction-type ${tx.status}">${tx.type.toUpperCase()}</span>
                    <span class="transaction-time">${this.formatTime(tx.timestamp)}</span>
                </div>
                <div class="transaction-details">
                    <div class="transaction-pair">
                        ${tx.amountIn} ${tx.tokenIn} → ${tx.amountOut} ${tx.tokenOut}
                    </div>
                    <div class="transaction-info-grid">
                        ${tx.pnl ? `<div class="transaction-pnl">
                            <span class="pnl-label">PnL:</span>
                            <span class="pnl-value">${tx.pnl}</span>
                        </div>` : ''}
                        ${tx.pnlPercentage && tx.pnlPercentage !== 'N/A' ? `<div class="transaction-pnl-percentage">
                            <span class="pnl-label">PnL %:</span>
                            <span class="pnl-value ${tx.pnlPercentage.startsWith('+') ? 'profit-positive' : tx.pnlPercentage.startsWith('-') ? 'profit-negative' : ''}">${tx.pnlPercentage}</span>
                        </div>` : ''}
                        ${tx.profit ? `<div class="transaction-profit ${parseFloat(tx.profit) >= 0 ? 'profit-positive' : 'profit-negative'}">
                            <span class="pnl-label">Profit:</span>
                            <span class="pnl-value">${tx.profit}</span>
                        </div>` : ''}
                        ${tx.feeTier ? `<div class="transaction-fee">
                            <span class="pnl-label">Fee:</span>
                            <span class="pnl-value">${(tx.feeTier / 10000).toFixed(2)}%</span>
                        </div>` : ''}
                        ${tx.priceImpact ? `<div class="transaction-impact">
                            <span class="pnl-label">Price Impact:</span>
                            <span class="pnl-value">${(parseFloat(tx.priceImpact) * 100).toFixed(2)}%</span>
                        </div>` : ''}
                    </div>
                    ${tx.transactionHash ? `<div class="transaction-hash">Hash: <a href="https://galascan.gala.com/tx/${tx.transactionHash}" target="_blank">${tx.transactionHash.substring(0, 20)}...</a></div>` : tx.status === 'failed' ? `<div class="transaction-hash failed">Hash: FAILED TRANSACTION</div>` : ''}
                    ${tx.strategy ? `<div class="transaction-strategy">Strategy: ${tx.strategy}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    displayTransactionError(error) {
        const container = document.getElementById('transactionsContent');
        container.innerHTML = `<div class="no-transactions">Error loading transactions: ${error}</div>`;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    getTokenSymbol(tokenClassKey) {
        const symbols = {
            'GALA|Unit|none|none': 'GALA',
            'GUSDC|Unit|none|none': 'USDC',
            'GETH|Unit|none|none': 'ETH',
            'GUSDT|Unit|none|none': 'USDT'
        };
        return symbols[tokenClassKey] || tokenClassKey;
    }


    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    showSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
    }

    hideSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    saveSettings() {
        this.apiBaseUrl = document.getElementById('apiUrl').value;
        localStorage.setItem('galaswap_api_url', this.apiBaseUrl);
        localStorage.setItem('galaswap_log_level', document.getElementById('logLevel').value);
        
        this.showToast('Settings saved', 'success');
        this.hideSettings();
        this.checkConnection();
    }

    loadSettings() {
        const savedApiUrl = localStorage.getItem('galaswap_api_url');
        const savedLogLevel = localStorage.getItem('galaswap_log_level');
        
        if (savedApiUrl) {
            this.apiBaseUrl = savedApiUrl;
            document.getElementById('apiUrl').value = savedApiUrl;
        }
        
        if (savedLogLevel) {
            document.getElementById('logLevel').value = savedLogLevel;
        }
    }

    showLogs() {
        // This would typically open a logs window or modal
        this.showToast('Logs feature coming soon', 'info');
    }

    showStrategyInfo() {
        document.getElementById('strategyInfoModal').style.display = 'flex';
    }

    hideStrategyInfo() {
        document.getElementById('strategyInfoModal').style.display = 'none';
    }

    showLunarInfo() {
        document.getElementById('lunarInfoModal').style.display = 'flex';
    }

    hideLunarInfo() {
        document.getElementById('lunarInfoModal').style.display = 'none';
    }

    // Prime Interval Strategy Management
    async initializePrimeControls() {
        const startBtn = document.getElementById('startPrimeStrategyBtn');
        const stopBtn = document.getElementById('stopPrimeStrategyBtn');
        const refreshBtn = document.getElementById('refreshPrimeStatusBtn');
        const resetBtn = document.getElementById('resetPrimeStrategyBtn');

        if (startBtn) startBtn.addEventListener('click', () => this.startPrimeStrategy());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopPrimeStrategy());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshPrimeStatus());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetPrimeStrategy());

        // Load initial status
        await this.refreshPrimeStatus();
    }

    async startPrimeStrategy() {
        try {
            const config = {
                tokenA: document.getElementById('primeTokenA').value,
                tokenB: document.getElementById('primeTokenB').value,
                slippageTolerance: parseFloat(document.getElementById('primeSlippage').value),
                swapPercentage: parseFloat(document.getElementById('primeSwapPercentage').value),
                feeTier: parseInt(document.getElementById('primeFeeTier').value),
                enabled: true
            };

            this.showToast('Starting Prime Cicada Strategy...', 'info');
            this.updatePrimeStatus({ isRunning: true });

            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ strategy: 'prime', config })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Prime Cicada Strategy started successfully', 'success');
                this.startPrimeResultsPolling();
            } else {
                this.showToast(`Failed to start strategy: ${result.error}`, 'error');
                this.updatePrimeStatus({ isRunning: false });
            }
        } catch (error) {
            console.error('Error starting Prime strategy:', error);
            this.showToast('Error starting Prime Cicada Strategy', 'error');
            this.updatePrimeStatus({ isRunning: false });
        }
    }

    async stopPrimeStrategy() {
        try {
            this.showToast('Stopping Prime Cicada Strategy...', 'info');
            this.updatePrimeStatus({ isRunning: false });

            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/stop`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Prime Cicada Strategy stopped successfully', 'success');
                this.stopPrimeResultsPolling();
            } else {
                this.showToast(`Failed to stop strategy: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error stopping Prime strategy:', error);
            this.showToast('Error stopping Prime Cicada Strategy', 'error');
        }
    }

    async refreshPrimeStatus() {
        try {
            console.log('Refreshing Prime status...');
            const response = await fetch(`${this.apiBaseUrl}/api/prime/status`);
            const data = await response.json();
            console.log('Prime status response:', data);

            if (data.isRunning && data.strategy === 'PrimeCicadaStrategy') {
                this.updatePrimeStatus({ isRunning: true });
                
                // Get detailed strategy status
                console.log('Fetching detailed strategy status...');
                const strategyResponse = await fetch(`${this.apiBaseUrl}/api/arbitrage/strategy-status`);
                if (strategyResponse.ok) {
                    const strategyData = await strategyResponse.json();
                    console.log('Strategy status response:', strategyData);
                    this.updatePrimeIntervalInfo(strategyData);
                } else {
                    console.error('Failed to get strategy status:', strategyResponse.status, strategyResponse.statusText);
                }
            } else {
                console.log('Prime strategy not running, clearing interval info');
                this.updatePrimeStatus({ isRunning: false });
                this.clearPrimeIntervalInfo();
            }
        } catch (error) {
            console.error('Error refreshing Prime status:', error);
        }
    }

    async resetPrimeStrategy() {
        try {
            this.showToast('Resetting Prime Cicada Strategy...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/reset`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Prime Cicada Strategy reset successfully', 'success');
                await this.refreshPrimeStatus();
            } else {
                this.showToast(`Failed to reset strategy: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error resetting Prime strategy:', error);
            this.showToast('Error resetting Prime Cicada Strategy', 'error');
        }
    }

    updatePrimeStatus(status) {
        const statusElement = document.getElementById('primeStatus');
        const startBtn = document.getElementById('startPrimeStrategyBtn');
        const stopBtn = document.getElementById('stopPrimeStrategyBtn');

        if (status.isRunning) {
            statusElement.innerHTML = '<span class="status-dot online"></span><span>Running</span>';
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            statusElement.innerHTML = '<span class="status-dot offline"></span><span>Stopped</span>';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }

    updatePrimeIntervalInfo(strategyData) {
        console.log('updatePrimeIntervalInfo called with:', strategyData);
        
        if (strategyData && strategyData.success !== false) {
            // Handle both direct strategy data and API response wrapper
            const data = strategyData.success !== undefined ? strategyData : strategyData;
            
            document.getElementById('currentIntervalNumber').textContent = data.currentInterval || '-';
            document.getElementById('currentPrimeNumber').textContent = data.primeNumber || '-';
            document.getElementById('nextPrimeAction').textContent = data.isBuyingTokenB ? 
                `Buy ${data.tokenB}` : `Sell ${data.tokenB}`;
            
            if (data.nextSwapTime) {
                const nextTime = new Date(data.nextSwapTime);
                document.getElementById('nextPrimeSwapTime').textContent = nextTime.toLocaleString();
            }
        } else {
            console.log('No valid strategy data to display');
        }
    }

    clearPrimeIntervalInfo() {
        document.getElementById('currentIntervalNumber').textContent = '-';
        document.getElementById('currentPrimeNumber').textContent = '-';
        document.getElementById('nextPrimeAction').textContent = '-';
        document.getElementById('nextPrimeSwapTime').textContent = '-';
    }

    startPrimeResultsPolling() {
        // Poll for results and status every 10 seconds
        this.primeResultsInterval = setInterval(() => {
            this.loadPrimeResults();
            this.refreshPrimeStatus(); // Also refresh the Current Interval data
        }, 10000);
    }

    stopPrimeResultsPolling() {
        if (this.primeResultsInterval) {
            clearInterval(this.primeResultsInterval);
            this.primeResultsInterval = null;
        }
    }

    async loadPrimeResults() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/results`);
            const data = await response.json();

            if (data.success && data.results) {
                this.displayPrimeResults(data.results);
            }
        } catch (error) {
            console.error('Error loading Prime results:', error);
        }
    }

    displayPrimeResults(results) {
        const resultsContainer = document.getElementById('primeResults');
        
        // Filter results for Prime Cicada Strategy
        const primeResults = results.filter(result => 
            result.type === 'Prime Cicada Swap'
        );

        if (primeResults.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No results yet</div>';
            return;
        }

        const resultsHtml = primeResults.slice(0, 5).map(result => `
            <div class="result-item">
                <div class="result-header">
                    <span class="result-type">${result.action || 'SWAP'}</span>
                    <span class="result-time">${new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="result-details">
                    <div class="result-pair">${result.tokenIn} → ${result.tokenOut}</div>
                    <div class="result-amount">Amount: ${result.amount}</div>
                    <div class="result-interval">Prime: ${result.primeInterval || 'N/A'}</div>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = resultsHtml;
    }

    showPrimeInfo() {
        document.getElementById('primeInfoModal').style.display = 'flex';
    }

    hidePrimeInfo() {
        document.getElementById('primeInfoModal').style.display = 'none';
    }

    showTokenSwapInfo() {
        document.getElementById('tokenSwapInfoModal').style.display = 'flex';
    }

    hideTokenSwapInfo() {
        document.getElementById('tokenSwapInfoModal').style.display = 'none';
    }

    // Arbitrage Strategy Management
    async initializeArbitrageControls() {
        const startBtn = document.getElementById('startStrategyBtn');
        const stopBtn = document.getElementById('stopStrategyBtn');
        const refreshBtn = document.getElementById('refreshStrategyBtn');

        if (startBtn) startBtn.addEventListener('click', () => this.startArbitrageStrategy());
        if (stopBtn) stopBtn.addEventListener('click', () => {
            console.log('STOP BUTTON CLICKED: Direct event handler');
            // Immediately force UI to stopped state
            this.forceStopButtonState();
            // Then call the normal stop method
            this.stopArbitrageStrategy();
        });
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshArbitrageStatus());

        // Load initial status
        await this.refreshArbitrageStatus();
    }

    // Lunar Strategy Management
    async initializeLunarControls() {
        const startBtn = document.getElementById('startLunarBtn');
        const stopBtn = document.getElementById('stopLunarBtn');
        const refreshBtn = document.getElementById('refreshLunarBtn');

        if (startBtn) startBtn.addEventListener('click', () => this.startLunarStrategy());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopLunarStrategy());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshLunarStatus());

        // Load initial lunar phase and status
        await this.loadLunarPhase();
        await this.refreshLunarStatus();
    }

    async startArbitrageStrategy() {
        // Prevent double-clicks
        if (this.isProcessingArbitrage) {
            return;
        }

        try {
            this.isProcessingArbitrage = true;
            const strategy = document.getElementById('strategySelect').value;
            const config = {
                minProfitThreshold: parseFloat(document.getElementById('minProfitThreshold').value),
                maxPositionSize: document.getElementById('maxPositionSize').value,
                maxSlippage: parseFloat(document.getElementById('maxSlippage').value),
                scanInterval: parseInt(document.getElementById('scanInterval').value)
            };

            // Update button states immediately to prevent double-clicks
            this.updateArbitrageStatus({ isRunning: true, strategy: strategy });
            this.showToast('Starting arbitrage strategy...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ strategy, config })
            });

            const result = await response.json();
            console.log('API Response:', result);

            if (result.success) {
                this.showToast(`Arbitrage strategy '${strategy}' started successfully`, 'success');
                console.log('Strategy started successfully, scheduling page refresh in 3 seconds...');
                // Start polling for results
                this.startArbitrageResultsPolling();
                // Force update button states to running
                this.updateArbitrageStatus({ isRunning: true, strategy: strategy });
                // Wait a bit longer before allowing status checks to resume
                setTimeout(() => {
                    this.isProcessingArbitrage = false;
                    this.refreshArbitrageStatus();
                }, 2000);
                
                // Refresh the page after successful strategy start
                setTimeout(() => {
                    console.log('Refreshing page now...');
                    window.location.reload();
                }, 3000);
            } else {
                this.showToast(`Failed to start strategy: ${result.error}`, 'error');
                // Reset button states on failure
                this.updateArbitrageStatus({ isRunning: false, strategy: null });
                setTimeout(() => {
                    this.isProcessingArbitrage = false;
                }, 1000);
            }

        } catch (error) {
            this.showToast(`Error starting strategy: ${error.message}`, 'error');
            // Reset button states on error
            this.updateArbitrageStatus({ isRunning: false, strategy: null });
            setTimeout(() => {
                this.isProcessingArbitrage = false;
            }, 1000);
        }
    }

    async stopArbitrageStrategy() {
        // Prevent double-clicks
        if (this.isProcessingArbitrage) {
            return;
        }

        try {
            this.isProcessingArbitrage = true;
            
            // COMPLETELY stop all status checks and polling
            this.stopStatusChecks();
            this.stopArbitrageResultsPolling();
            
            // Force immediate UI update to stopped state
            this.forceUpdateArbitrageUI({ isRunning: false, strategy: null });
            this.showToast('Stopping arbitrage strategy...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Arbitrage strategy stopped successfully', 'success');
                // Use direct DOM manipulation for immediate UI update
                this.forceStopButtonState();
                this.emergencyStopUI();
            } else {
                this.showToast(`Failed to stop strategy: ${result.error}`, 'error');
                // Use direct DOM manipulation even on failure
                this.forceStopButtonState();
                this.emergencyStopUI();
            }

        } catch (error) {
            this.showToast(`Error stopping strategy: ${error.message}`, 'error');
            // Use direct DOM manipulation on error
            this.forceStopButtonState();
            this.emergencyStopUI();
        } finally {
            // Always reset the processing flag
            this.isProcessingArbitrage = false;
        }
    }

    async refreshArbitrageStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/status`);
            const result = await response.json();

            if (result.success) {
                // Only update if we're not currently processing a start/stop operation
                if (!this.isProcessingArbitrage) {
                    this.updateArbitrageStatus(result);
                }
            } else {
                // If status check fails, assume stopped
                if (!this.isProcessingArbitrage) {
                    this.updateArbitrageStatus({ isRunning: false, strategy: null });
                }
            }

        } catch (error) {
            console.error('Failed to refresh arbitrage status:', error);
            // If status check fails, assume stopped
            if (!this.isProcessingArbitrage) {
                this.updateArbitrageStatus({ isRunning: false, strategy: null });
            }
        }
    }

    updateArbitrageStatus(status) {
        const statusElement = document.getElementById('strategyStatus');
        const startBtn = document.getElementById('startStrategyBtn');
        const stopBtn = document.getElementById('stopStrategyBtn');

        console.log('Updating arbitrage status:', status);

        // Don't show Pool Shark under Arbitrage Strategies
        if (status.isRunning && status.strategy !== 'TokenSwapStrategy') {
            statusElement.innerHTML = `
                <span class="status-dot online"></span>
                <span>Running: ${status.strategy || 'Unknown Strategy'}</span>
            `;
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
                startBtn.style.pointerEvents = 'none';
                startBtn.classList.add('disabled');
            }
            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.style.opacity = '1';
                stopBtn.style.cursor = 'pointer';
                stopBtn.style.pointerEvents = 'auto';
                stopBtn.classList.remove('disabled');
                console.log('Stop button enabled:', stopBtn.disabled, stopBtn.style.opacity);
            }
        } else {
            statusElement.innerHTML = `
                <span class="status-dot offline"></span>
                <span>Stopped</span>
            `;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
                startBtn.style.pointerEvents = 'auto';
                startBtn.classList.remove('disabled');
            }
            if (stopBtn) {
                stopBtn.disabled = true;
                stopBtn.style.opacity = '0.4';
                stopBtn.style.cursor = 'not-allowed';
                stopBtn.style.pointerEvents = 'none';
                stopBtn.classList.add('disabled');
                console.log('Stop button disabled:', stopBtn.disabled, stopBtn.style.opacity);
            }
        }
        
        // Force a reflow to ensure styles are applied
        if (startBtn) startBtn.offsetHeight;
        if (stopBtn) stopBtn.offsetHeight;
        
        // Additional force update - directly manipulate attributes
        if (startBtn) {
            if (status.isRunning) {
                startBtn.setAttribute('disabled', 'true');
                startBtn.setAttribute('aria-disabled', 'true');
            } else {
                startBtn.removeAttribute('disabled');
                startBtn.removeAttribute('aria-disabled');
            }
        }
        
        if (stopBtn) {
            if (status.isRunning) {
                stopBtn.removeAttribute('disabled');
                stopBtn.removeAttribute('aria-disabled');
            } else {
                stopBtn.setAttribute('disabled', 'true');
                stopBtn.setAttribute('aria-disabled', 'true');
            }
        }
    }

    // More aggressive UI update method for stop operations
    forceUpdateArbitrageUI(status) {
        const statusElement = document.getElementById('strategyStatus');
        const startBtn = document.getElementById('startStrategyBtn');
        const stopBtn = document.getElementById('stopStrategyBtn');

        console.log('FORCE updating arbitrage status:', status);

        if (status.isRunning) {
            statusElement.innerHTML = `
                <span class="status-dot online"></span>
                <span>Running: ${status.strategy || 'Unknown Strategy'}</span>
            `;
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
                startBtn.style.pointerEvents = 'none';
                startBtn.classList.add('disabled');
                startBtn.setAttribute('disabled', 'true');
                startBtn.setAttribute('aria-disabled', 'true');
            }
            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.style.opacity = '1';
                stopBtn.style.cursor = 'pointer';
                stopBtn.style.pointerEvents = 'auto';
                stopBtn.classList.remove('disabled');
                stopBtn.removeAttribute('disabled');
                stopBtn.removeAttribute('aria-disabled');
                console.log('FORCE: Stop button enabled:', stopBtn.disabled, stopBtn.style.opacity);
            }
        } else {
            statusElement.innerHTML = `
                <span class="status-dot offline"></span>
                <span>Stopped</span>
            `;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
                startBtn.style.pointerEvents = 'auto';
                startBtn.classList.remove('disabled');
                startBtn.removeAttribute('disabled');
                startBtn.removeAttribute('aria-disabled');
            }
            if (stopBtn) {
                stopBtn.disabled = true;
                stopBtn.style.opacity = '0.4';
                stopBtn.style.cursor = 'not-allowed';
                stopBtn.style.pointerEvents = 'none';
                stopBtn.classList.add('disabled');
                stopBtn.setAttribute('disabled', 'true');
                stopBtn.setAttribute('aria-disabled', 'true');
                console.log('FORCE: Stop button disabled:', stopBtn.disabled, stopBtn.style.opacity);
            }
        }
        
        // Force multiple reflows to ensure styles are applied
        if (startBtn) {
            startBtn.offsetHeight;
            startBtn.offsetWidth;
        }
        if (stopBtn) {
            stopBtn.offsetHeight;
            stopBtn.offsetWidth;
        }
        
        // Force a repaint
        if (statusElement) {
            statusElement.offsetHeight;
        }
    }

    // Emergency stop method that bypasses all other logic
    emergencyStopUI() {
        console.log('EMERGENCY STOP: Forcing UI to stopped state');
        
        // Completely stop all intervals
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        if (this.arbitrageResultsInterval) {
            clearInterval(this.arbitrageResultsInterval);
            this.arbitrageResultsInterval = null;
        }
        
        // Force UI to stopped state
        const statusElement = document.getElementById('strategyStatus');
        const startBtn = document.getElementById('startStrategyBtn');
        const stopBtn = document.getElementById('stopStrategyBtn');

        if (statusElement) {
            statusElement.innerHTML = `
                <span class="status-dot offline"></span>
                <span>Stopped</span>
            `;
        }
        
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            startBtn.style.cursor = 'pointer';
            startBtn.style.pointerEvents = 'auto';
            startBtn.classList.remove('disabled');
            startBtn.removeAttribute('disabled');
            startBtn.removeAttribute('aria-disabled');
        }
        
        if (stopBtn) {
            stopBtn.disabled = true;
            stopBtn.style.opacity = '0.4';
            stopBtn.style.cursor = 'not-allowed';
            stopBtn.style.pointerEvents = 'none';
            stopBtn.classList.add('disabled');
            stopBtn.setAttribute('disabled', 'true');
            stopBtn.setAttribute('aria-disabled', 'true');
        }
        
        // Restart status checks after a delay
        setTimeout(() => {
            this.startStatusChecks();
        }, 10000);
    }

    // Direct DOM manipulation for immediate stop button fix
    forceStopButtonState() {
        console.log('FORCE STOP: Direct DOM manipulation');
        
        const startBtn = document.getElementById('startStrategyBtn');
        const stopBtn = document.getElementById('stopStrategyBtn');
        const statusElement = document.getElementById('strategyStatus');
        
        // Force stop button to be disabled
        if (stopBtn) {
            stopBtn.disabled = true;
            stopBtn.style.opacity = '0.4';
            stopBtn.style.cursor = 'not-allowed';
            stopBtn.style.pointerEvents = 'none';
            stopBtn.classList.add('disabled');
            stopBtn.setAttribute('disabled', 'true');
            stopBtn.setAttribute('aria-disabled', 'true');
            console.log('FORCE STOP: Stop button disabled');
        }
        
        // Force start button to be enabled
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            startBtn.style.cursor = 'pointer';
            startBtn.style.pointerEvents = 'auto';
            startBtn.classList.remove('disabled');
            startBtn.removeAttribute('disabled');
            startBtn.removeAttribute('aria-disabled');
            console.log('FORCE STOP: Start button enabled');
        }
        
        // Force status to show stopped
        if (statusElement) {
            statusElement.innerHTML = `
                <span class="status-dot offline"></span>
                <span>Stopped</span>
            `;
            console.log('FORCE STOP: Status set to stopped');
        }
        
        // Force multiple reflows
        if (startBtn) startBtn.offsetHeight;
        if (stopBtn) stopBtn.offsetHeight;
        if (statusElement) statusElement.offsetHeight;
    }

    async loadArbitrageResults() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/results`);
            const result = await response.json();

            if (result.success) {
                this.displayArbitrageResults(result.results);
            }

        } catch (error) {
            console.error('Failed to load arbitrage results:', error);
        }
    }

    displayArbitrageResults(results) {
        const container = document.getElementById('strategyResults');

        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-info-circle"></i>
                    <p>No strategy running. Start a strategy to see results.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = results.map(result => `
            <div class="strategy-result">
                <div class="result-header">
                    <span class="result-type">${result.type || 'Arbitrage Opportunity'}</span>
                    <span class="result-time">${new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="result-details">
                    ${result.amount ? `<div class="result-detail"><span class="label">Amount:</span><span class="value">${result.amount}</span></div>` : ''}
                    ${result.profitPercentage ? `<div class="result-detail"><span class="label">Profit:</span><span class="value ${result.profitPercentage > 0 ? 'profit-positive' : 'profit-negative'}">${result.profitPercentage.toFixed(4)}%</span></div>` : ''}
                    ${result.expectedProfit ? `<div class="result-detail"><span class="label">Expected:</span><span class="value">${result.expectedProfit}</span></div>` : ''}
                    ${result.tokenIn ? `<div class="result-detail"><span class="label">Token In:</span><span class="value">${result.tokenIn}</span></div>` : ''}
                    ${result.tokenOut ? `<div class="result-detail"><span class="label">Token Out:</span><span class="value">${result.tokenOut}</span></div>` : ''}
                </div>
            </div>
        `).join('');
    }

    startArbitrageResultsPolling() {
        // Poll for results every 5 seconds when strategy is running
        this.arbitrageResultsInterval = setInterval(() => {
            this.loadArbitrageResults();
        }, 5000);
    }

    stopArbitrageResultsPolling() {
        if (this.arbitrageResultsInterval) {
            clearInterval(this.arbitrageResultsInterval);
            this.arbitrageResultsInterval = null;
        }
    }

    startStatusChecks() {
        // Check arbitrage status every 10 seconds
        this.statusCheckInterval = setInterval(() => {
            this.refreshArbitrageStatus();
        }, 10000);
    }

    stopStatusChecks() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    // Lunar Strategy Methods
    async startLunarStrategy() {
        try {
            const config = {
                minTradeAmount: document.getElementById('lunarMinTradeAmount').value,
                maxTradeAmount: document.getElementById('lunarMaxTradeAmount').value,
                checkInterval: 300000, // 5 minutes
                maxSlippage: 0.5,
                enabledTokens: ['GALA', 'USDC'],
                strategy: document.getElementById('lunarStrategy').value,
                phaseThreshold: parseFloat(document.getElementById('lunarPhaseThreshold').value),
                riskManagement: {
                    stopLossPercentage: parseFloat(document.getElementById('lunarStopLoss').value),
                    takeProfitPercentage: parseFloat(document.getElementById('lunarTakeProfit').value),
                    maxPositionSize: 20
                }
            };

            this.showToast('Starting lunar strategy...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ strategy: 'lunar', config })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Lunar strategy started successfully', 'success');
                this.updateLunarStatus({ isRunning: true, strategy: 'lunar' });
                this.startLunarResultsPolling();
            } else {
                this.showToast(`Failed to start lunar strategy: ${result.error}`, 'error');
            }

        } catch (error) {
            this.showToast(`Error starting lunar strategy: ${error.message}`, 'error');
        }
    }

    async stopLunarStrategy() {
        try {
            this.showToast('Stopping lunar strategy...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Lunar strategy stopped successfully', 'success');
                this.updateLunarStatus({ isRunning: false, strategy: null });
                this.stopLunarResultsPolling();
            } else {
                this.showToast(`Failed to stop lunar strategy: ${result.error}`, 'error');
            }

        } catch (error) {
            this.showToast(`Error stopping lunar strategy: ${error.message}`, 'error');
        }
    }

    async refreshLunarStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/lunar/status`);
            const result = await response.json();

            if (result.success) {
                this.updateLunarStatus(result);
            }

        } catch (error) {
            console.error('Failed to refresh lunar status:', error);
        }
    }

    async loadLunarPhase() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/lunar/phase`);
            const result = await response.json();

            if (result.success) {
                this.displayLunarPhase(result.phaseInfo);
            }

        } catch (error) {
            console.error('Failed to load lunar phase:', error);
        }
    }

    async loadLunarPosition() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/lunar/position`);
            const result = await response.json();

            if (result.success) {
                this.displayLunarPosition(result.position);
            }

        } catch (error) {
            console.error('Failed to load lunar position:', error);
        }
    }

    updateLunarStatus(status) {
        const statusElement = document.getElementById('lunarStatus');
        const startBtn = document.getElementById('startLunarBtn');
        const stopBtn = document.getElementById('stopLunarBtn');

        if (status.isRunning) {
            statusElement.innerHTML = `
                <span class="status-dot online"></span>
                <span>Running: ${status.strategy || 'Lunar Strategy'}</span>
            `;
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
            }
            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.style.opacity = '1';
            }
        } else {
            statusElement.innerHTML = `
                <span class="status-dot offline"></span>
                <span>Stopped</span>
            `;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
            }
            if (stopBtn) {
                stopBtn.disabled = true;
                stopBtn.style.opacity = '0.4';
            }
        }
    }

    displayLunarPhase(phaseInfo) {
        document.getElementById('currentPhaseName').textContent = phaseInfo.phaseName;
        document.getElementById('currentPhaseValue').textContent = phaseInfo.phase.toFixed(3);
        document.getElementById('daysToNextPhase').textContent = phaseInfo.daysToNextPhase.toFixed(1) + ' days';
        
        let status = '';
        if (phaseInfo.isNewMoon) status = 'New Moon - Buy Signal';
        else if (phaseInfo.isFullMoon) status = 'Full Moon - Sell Signal';
        else if (phaseInfo.isWaxing) status = 'Waxing - Gradual Buy';
        else if (phaseInfo.isWaning) status = 'Waning - Gradual Sell';
        else status = 'Neutral';
        
        document.getElementById('phaseStatus').textContent = status;
    }

    displayLunarPosition(position) {
        const container = document.getElementById('lunarPositionInfo');
        
        if (!position) {
            container.innerHTML = '<div class="no-position">No active position</div>';
            return;
        }

        container.innerHTML = `
            <div class="position-info">
                <div class="position-header">
                    <span class="position-pair">${position.tokenIn}/${position.tokenOut}</span>
                    <span class="position-amount">${position.amount}</span>
                </div>
                <div class="position-details">
                    <div class="position-detail">
                        <span class="label">Entry Price:</span>
                        <span class="value">${position.entryPrice}</span>
                    </div>
                    <div class="position-detail">
                        <span class="label">Entry Date:</span>
                        <span class="value">${new Date(position.entryDate).toLocaleString()}</span>
                    </div>
                    <div class="position-detail">
                        <span class="label">Stop Loss:</span>
                        <span class="value">${position.stopLoss}</span>
                    </div>
                    <div class="position-detail">
                        <span class="label">Take Profit:</span>
                        <span class="value">${position.takeProfit}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async loadLunarResults() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/results`);
            const result = await response.json();

            if (result.success) {
                this.displayLunarResults(result.results);
            }

        } catch (error) {
            console.error('Failed to load lunar results:', error);
        }
    }

    displayLunarResults(results) {
        const container = document.getElementById('lunarResults');

        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-moon"></i>
                    <p>No lunar strategy running. Start a strategy to see results.</p>
                </div>
            `;
            return;
        }

        // Filter for lunar-related results
        const lunarResults = results.filter(result => 
            result.type && (
                result.type.includes('Lunar') || 
                result.type.includes('lunar') ||
                result.lunarPhase
            )
        );

        if (lunarResults.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-moon"></i>
                    <p>No lunar strategy results yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = lunarResults.map(result => `
            <div class="lunar-result">
                <div class="result-header">
                    <span class="result-type">${result.type || 'Lunar Signal'}</span>
                    <span class="result-time">${new Date(result.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="result-details">
                    ${result.amount ? `<div class="result-detail"><span class="label">Amount:</span><span class="value">${result.amount}</span></div>` : ''}
                    ${result.profitPercentage ? `<div class="result-detail"><span class="label">Profit:</span><span class="value ${result.profitPercentage > 0 ? 'profit-positive' : 'profit-negative'}">${result.profitPercentage.toFixed(4)}%</span></div>` : ''}
                    ${result.lunarPhase ? `<div class="result-detail"><span class="label">Lunar Phase:</span><span class="value">${result.lunarPhase}</span></div>` : ''}
                    ${result.signal ? `<div class="result-detail"><span class="label">Signal:</span><span class="value">${result.signal}</span></div>` : ''}
                    ${result.confidence ? `<div class="result-detail"><span class="label">Confidence:</span><span class="value">${(result.confidence * 100).toFixed(1)}%</span></div>` : ''}
                </div>
            </div>
        `).join('');
    }

    startLunarResultsPolling() {
        // Poll for lunar results every 10 seconds when strategy is running
        this.lunarResultsInterval = setInterval(() => {
            this.loadLunarResults();
            this.loadLunarPosition();
        }, 10000);
    }

    stopLunarResultsPolling() {
        if (this.lunarResultsInterval) {
            clearInterval(this.lunarResultsInterval);
            this.lunarResultsInterval = null;
        }
    }

    // Pool Shark Management
    async initializeTokenSwapControls() {
        const getQuoteBtn = document.getElementById('getSwap2QuoteBtn');
        const executeBtn = document.getElementById('executeSwap2Btn');
        const startBtn = document.getElementById('startSwap2StrategyBtn');
        const stopBtn = document.getElementById('stopSwap2StrategyBtn');
        const refreshBtn = document.getElementById('refreshSwap2StatusBtn');

        if (getQuoteBtn) getQuoteBtn.addEventListener('click', () => this.getSwap2Quote());
        if (executeBtn) executeBtn.addEventListener('click', () => this.executeSwap2());
        if (startBtn) startBtn.addEventListener('click', () => this.startSwap2Strategy());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopSwap2Strategy());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshSwap2Status());

        // Load initial status
        await this.refreshSwap2Status();
    }

    async getSwap2Quote() {
        const tokenIn = document.getElementById('swap2TokenIn').value;
        const tokenOut = document.getElementById('swap2TokenOut').value;
        const amountIn = document.getElementById('swap2Amount').value;
        const slippage = document.getElementById('swap2Slippage').value;
        const feeTier = parseInt(document.getElementById('swap2FeeTier').value);

        if (!amountIn || parseFloat(amountIn) <= 0) {
            this.showToast('Please enter a valid amount', 'error');
            return;
        }

        this.showToast('Getting quote...', 'info');

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance: parseFloat(slippage),
                    feeTier
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentSwap2Quote = data.quote;
                this.displaySwap2Quote(data.quote);
                document.getElementById('executeSwap2Btn').disabled = false;
                this.showToast('Quote received successfully', 'success');
            } else {
                this.showToast(`Quote failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`Error getting quote: ${error.message}`, 'error');
        }
    }

    displaySwap2Quote(quote) {
        document.getElementById('swap2AmountOut').textContent = quote.amountOut;
        document.getElementById('swap2PriceImpact').textContent = `${quote.priceImpact}%`;
        document.getElementById('swap2CurrentPrice').textContent = quote.currentPrice;
        document.getElementById('swap2NewPrice').textContent = quote.newPrice;
        document.getElementById('swap2QuoteFeeTier').textContent = `${quote.feeTier} (${(quote.feeTier / 100).toFixed(2)}%)`;
        
        document.getElementById('swap2QuoteResults').style.display = 'block';
    }

    async executeSwap2() {
        if (!this.currentSwap2Quote) {
            this.showToast('Please get a quote first', 'error');
            return;
        }

        const tokenIn = document.getElementById('swap2TokenIn').value;
        const tokenOut = document.getElementById('swap2TokenOut').value;
        const amountIn = document.getElementById('swap2Amount').value;
        const slippage = document.getElementById('swap2Slippage').value;
        const feeTier = parseInt(document.getElementById('swap2FeeTier').value);

        // Confirmation dialog
        const confirmMessage = `Execute swap: ${amountIn} ${this.getTokenSymbol(tokenIn)} → ${this.currentSwap2Quote.amountOut} ${this.getTokenSymbol(tokenOut)}?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        this.showToast('Executing swap...', 'info');

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance: parseFloat(slippage),
                    feeTier
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Swap executed successfully!', 'success');
                this.addTransaction({
                    type: 'Swap (Strategy 2)',
                    from: `${amountIn} ${this.getTokenSymbol(tokenIn)}`,
                    to: `${data.result.amountOut} ${this.getTokenSymbol(tokenOut)}`,
                    hash: data.result.transactionHash,
                    time: new Date().toLocaleString()
                });
                this.loadPortfolio();
                this.currentSwap2Quote = null;
                document.getElementById('executeSwap2Btn').disabled = true;
                document.getElementById('swap2QuoteResults').style.display = 'none';
            } else {
                this.showToast(`Swap failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`Error executing swap: ${error.message}`, 'error');
        }
    }

    async startSwap2Strategy() {
        try {
            const config = {
                tokenIn: document.getElementById('swap2TokenIn').value,
                tokenOut: document.getElementById('swap2TokenOut').value,
                amountIn: document.getElementById('swap2Amount').value,
                slippageTolerance: parseFloat(document.getElementById('swap2Slippage').value),
                feeTier: parseInt(document.getElementById('swap2FeeTier').value),
                intervalSeconds: parseInt(document.getElementById('swap2Interval').value),
                minAmountOut: document.getElementById('swap2MinAmountOut').value,
                enabled: true
            };

            if (!config.amountIn || parseFloat(config.amountIn) <= 0) {
                this.showToast('Please enter a valid amount', 'error');
                return;
            }

            if (!config.minAmountOut || parseFloat(config.minAmountOut) < 0) {
                this.showToast('Please enter a valid minimum amount out threshold', 'error');
                return;
            }

            this.showToast('Starting Pool Shark...', 'info');
            this.updateSwap2Status({ isRunning: true });

            const response = await fetch(`${this.apiBaseUrl}/api/token-swap/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Pool Shark started successfully', 'success');
                this.startSwap2ResultsPolling();
            } else {
                this.showToast(`Failed to start strategy: ${result.error}`, 'error');
                this.updateSwap2Status({ isRunning: false });
            }
        } catch (error) {
            console.error('Error starting Token Swap strategy:', error);
            this.showToast('Error starting Pool Shark', 'error');
            this.updateSwap2Status({ isRunning: false });
        }
    }

    async stopSwap2Strategy() {
        try {
            this.showToast('Stopping Pool Shark...', 'info');
            this.updateSwap2Status({ isRunning: false });

            const response = await fetch(`${this.apiBaseUrl}/api/token-swap/stop`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Pool Shark stopped successfully', 'success');
                this.stopSwap2ResultsPolling();
            } else {
                this.showToast(`Failed to stop strategy: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error stopping Token Swap strategy:', error);
            this.showToast('Error stopping Pool Shark', 'error');
        }
    }

    async refreshSwap2Status() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/token-swap/status`);
            const result = await response.json();

            if (result.success) {
                this.updateSwap2Status({ isRunning: result.isRunning });
            } else {
                this.updateSwap2Status({ isRunning: false });
            }
        } catch (error) {
            console.error('Error refreshing Pool Shark status:', error);
            this.updateSwap2Status({ isRunning: false });
        }
    }

    updateSwap2Status(status) {
        const statusElement = document.getElementById('tokenSwapStatus');
        const startBtn = document.getElementById('startSwap2StrategyBtn');
        const stopBtn = document.getElementById('stopSwap2StrategyBtn');

        if (status.isRunning) {
            statusElement.innerHTML = '<span class="status-dot online"></span><span>Running</span>';
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
        } else {
            statusElement.innerHTML = '<span class="status-dot offline"></span><span>Stopped</span>';
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
        }
    }

    startSwap2ResultsPolling() {
        // Poll for results every 10 seconds
        this.swap2ResultsInterval = setInterval(() => {
            this.loadSwap2Results();
        }, 10000);
    }

    stopSwap2ResultsPolling() {
        if (this.swap2ResultsInterval) {
            clearInterval(this.swap2ResultsInterval);
            this.swap2ResultsInterval = null;
        }
    }

    async loadSwap2Results() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/arbitrage/results`);
            const data = await response.json();

            if (data.success && data.results) {
                this.displaySwap2Results(data.results);
            }
        } catch (error) {
            console.error('Error loading Token Swap results:', error);
        }
    }

    displaySwap2Results(results) {
        const resultsContainer = document.getElementById('swap2Results');
        
        // Filter results for Pool Shark
        const swap2Results = results.filter(result => 
            result.type && result.type.includes('Pool Shark')
        );

        if (swap2Results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No results yet</div>';
            return;
        }

        const resultsHtml = swap2Results.slice(-8).map(result => {
            let statusClass = 'info';
            let statusIcon = 'fa-info-circle';
            
            if (result.action === 'EXECUTED') {
                statusClass = 'success';
                statusIcon = 'fa-check-circle';
            } else if (result.action === 'SKIPPED') {
                statusClass = 'warning';
                statusIcon = 'fa-pause-circle';
            } else if (result.action === 'FAILED' || result.action === 'ERROR' || result.action === 'QUOTE_FAILED') {
                statusClass = 'error';
                statusIcon = 'fa-times-circle';
            }
            
            return `
                <div class="result-item ${statusClass}">
                    <div class="result-header">
                        <i class="fas ${statusIcon}"></i>
                        <span class="result-type">${result.action || 'SWAP'}</span>
                        <span class="result-time">${new Date(result.timestamp).toLocaleTimeString()}</span>
                        ${result.swapNumber ? `<span class="result-swap-number">#${result.swapNumber}</span>` : ''}
                    </div>
                    <div class="result-details">
                        <div class="result-pair">${result.tokenIn} → ${result.tokenOut}</div>
                        <div class="result-amount">Amount: ${result.amount}</div>
                    </div>
                    ${result.expectedAmountOut ? `
                        <div class="result-quote">
                            <span class="quote-label">Expected:</span>
                            <span class="quote-value">${result.expectedAmountOut} ${result.tokenOut}</span>
                            ${result.minAmountOut ? `<span class="quote-threshold">(Min: ${result.minAmountOut})</span>` : ''}
                        </div>
                    ` : ''}
                    ${result.amountOut ? `
                        <div class="result-executed">
                            <span class="executed-label">Actual:</span>
                            <span class="executed-value">${result.amountOut} ${result.tokenOut}</span>
                        </div>
                    ` : ''}
                    ${result.transactionHash ? `
                        <div class="result-tx">
                            <span class="tx-label">TX:</span>
                            <span class="tx-hash">${result.transactionHash.substring(0, 10)}...</span>
                        </div>
                    ` : ''}
                    ${result.reason ? `<div class="result-reason">${result.reason}</div>` : ''}
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHtml;
    }

    // Pool Shark 2 Management
    async initializeTokenSwap2Controls() {
        const getQuoteBtn = document.getElementById('getSwap3QuoteBtn');
        const executeBtn = document.getElementById('executeSwap3Btn');
        const startBtn = document.getElementById('startSwap3StrategyBtn');
        const stopBtn = document.getElementById('stopSwap3StrategyBtn');
        const refreshBtn = document.getElementById('refreshSwap3StatusBtn');

        if (getQuoteBtn) getQuoteBtn.addEventListener('click', () => this.getSwap3Quote());
        if (executeBtn) executeBtn.addEventListener('click', () => this.executeSwap3());
        if (startBtn) startBtn.addEventListener('click', () => this.startSwap3Strategy());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopSwap3Strategy());
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshSwap3Status());

        // Info modal
        const infoBtn = document.getElementById('showTokenSwap2Info');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.showModal('tokenSwap2InfoModal'));
        }

        // Initial status check
        this.refreshSwap3Status();
    }

    async getSwap3Quote() {
        try {
            const tokenIn = document.getElementById('swap3TokenIn').value;
            const tokenOut = document.getElementById('swap3TokenOut').value;
            const amountIn = document.getElementById('swap3Amount').value;
            const slippageTolerance = parseFloat(document.getElementById('swap3Slippage').value);
            const feeTier = parseInt(document.getElementById('swap3FeeTier').value);

            if (!amountIn || parseFloat(amountIn) <= 0) {
                this.showToast('Please enter a valid amount', 'error');
                return;
            }

            this.showToast('Getting quote...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance,
                    feeTier
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displaySwap3Quote(result.quote);
                this.showToast('Quote retrieved successfully', 'success');
            } else {
                this.showToast(`Failed to get quote: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error getting quote:', error);
            this.showToast('Error getting quote', 'error');
        }
    }

    displaySwap3Quote(quote) {
        document.getElementById('swap3QuoteAmountOut').textContent = quote.amountOut || '-';
        document.getElementById('swap3QuotePriceImpact').textContent = quote.priceImpact ? `${quote.priceImpact}%` : '-';
        document.getElementById('swap3QuoteFeeTier').textContent = quote.feeTier ? `${quote.feeTier / 10000}%` : '-';
    }

    async executeSwap3() {
        try {
            const tokenIn = document.getElementById('swap3TokenIn').value;
            const tokenOut = document.getElementById('swap3TokenOut').value;
            const amountIn = document.getElementById('swap3Amount').value;
            const slippageTolerance = parseFloat(document.getElementById('swap3Slippage').value);
            const feeTier = parseInt(document.getElementById('swap3FeeTier').value);

            if (!amountIn || parseFloat(amountIn) <= 0) {
                this.showToast('Please enter a valid amount', 'error');
                return;
            }

            this.showToast('Executing swap...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tokenIn,
                    tokenOut,
                    amountIn,
                    slippageTolerance,
                    feeTier
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Swap executed successfully', 'success');
                this.refreshSwap3Status();
                this.loadSwap3Results();
            } else {
                this.showToast(`Swap failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error executing swap:', error);
            this.showToast('Error executing swap', 'error');
        }
    }

    async startSwap3Strategy() {
        try {
            const config = {
                tokenIn: document.getElementById('swap3TokenIn').value,
                tokenOut: document.getElementById('swap3TokenOut').value,
                amountIn: document.getElementById('swap3Amount').value,
                slippageTolerance: parseFloat(document.getElementById('swap3Slippage').value),
                feeTier: parseInt(document.getElementById('swap3FeeTier').value),
                intervalSeconds: parseInt(document.getElementById('swap3Interval').value),
                minAmountOut: document.getElementById('swap3MinAmountOut').value,
                enabled: true
            };

            if (!config.amountIn || parseFloat(config.amountIn) <= 0) {
                this.showToast('Please enter a valid amount', 'error');
                return;
            }

            if (!config.minAmountOut || parseFloat(config.minAmountOut) < 0) {
                this.showToast('Please enter a valid minimum amount out threshold', 'error');
                return;
            }

            this.showToast('Starting Pool Shark 2...', 'info');
            this.updateSwap3Status({ isRunning: true });

            const response = await fetch(`${this.apiBaseUrl}/api/token-swap-2/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Pool Shark 2 started successfully', 'success');
                this.startSwap3ResultsPolling();
            } else {
                this.showToast(`Failed to start strategy: ${result.error}`, 'error');
                this.updateSwap3Status({ isRunning: false });
            }
        } catch (error) {
            console.error('Error starting Pool Shark 2 strategy:', error);
            this.showToast('Error starting Pool Shark 2', 'error');
            this.updateSwap3Status({ isRunning: false });
        }
    }

    async stopSwap3Strategy() {
        try {
            this.showToast('Stopping Pool Shark 2...', 'info');

            const response = await fetch(`${this.apiBaseUrl}/api/token-swap-2/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Pool Shark 2 stopped successfully', 'success');
                this.updateSwap3Status({ isRunning: false });
                this.stopSwap3ResultsPolling();
            } else {
                this.showToast(`Failed to stop strategy: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error stopping Pool Shark 2 strategy:', error);
            this.showToast('Error stopping Pool Shark 2', 'error');
        }
    }

    async refreshSwap3Status() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/token-swap-2/status`);
            const result = await response.json();

            if (result.success) {
                this.updateSwap3Status(result);
            }
        } catch (error) {
            console.error('Error refreshing Pool Shark 2 status:', error);
        }
    }

    updateSwap3Status(status) {
        const statusElement = document.getElementById('swap3Status');
        const startBtn = document.getElementById('startSwap3StrategyBtn');
        const stopBtn = document.getElementById('stopSwap3StrategyBtn');

        if (status.isRunning) {
            statusElement.innerHTML = `
                <span class="status-dot online"></span>
                <span>Running</span>
            `;
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
                startBtn.style.pointerEvents = 'none';
                startBtn.classList.add('disabled');
            }
            if (stopBtn) {
                stopBtn.disabled = false;
                stopBtn.style.opacity = '1';
                stopBtn.style.cursor = 'pointer';
                stopBtn.style.pointerEvents = 'auto';
                stopBtn.classList.remove('disabled');
            }
        } else {
            statusElement.innerHTML = `
                <span class="status-dot offline"></span>
                <span>Stopped</span>
            `;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
                startBtn.style.pointerEvents = 'auto';
                startBtn.classList.remove('disabled');
            }
            if (stopBtn) {
                stopBtn.disabled = true;
                stopBtn.style.opacity = '0.5';
                stopBtn.style.cursor = 'not-allowed';
                stopBtn.style.pointerEvents = 'none';
                stopBtn.classList.add('disabled');
            }
        }
    }

    startSwap3ResultsPolling() {
        if (this.swap3ResultsInterval) {
            clearInterval(this.swap3ResultsInterval);
        }
        
        this.swap3ResultsInterval = setInterval(() => {
            this.loadSwap3Results();
        }, 5000);
    }

    stopSwap3ResultsPolling() {
        if (this.swap3ResultsInterval) {
            clearInterval(this.swap3ResultsInterval);
            this.swap3ResultsInterval = null;
        }
    }

    async loadSwap3Results() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/transactions?limit=50`);
            const data = await response.json();

            if (data.success) {
                this.displaySwap3Results(data.results);
            }
        } catch (error) {
            console.error('Error loading Pool Shark 2 results:', error);
        }
    }

    displaySwap3Results(results) {
        const resultsContainer = document.getElementById('swap3Results');
        
        // Filter results for Pool Shark 2
        const swap3Results = results.filter(result => 
            result.type && result.type.includes('Pool Shark 2')
        );

        if (swap3Results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">No results yet</div>';
            return;
        }

        const resultsHtml = swap3Results.slice(-8).map(result => {
            let statusClass = 'info';
            let statusIcon = 'fa-info-circle';
            
            if (result.action === 'EXECUTED') {
                statusClass = 'success';
                statusIcon = 'fa-check-circle';
            } else if (result.action === 'SKIPPED') {
                statusClass = 'warning';
                statusIcon = 'fa-pause-circle';
            } else if (result.action === 'FAILED' || result.action === 'ERROR' || result.action === 'QUOTE_FAILED') {
                statusClass = 'error';
                statusIcon = 'fa-times-circle';
            }
            
            return `
                <div class="result-item ${statusClass}">
                    <div class="result-header">
                        <i class="fas ${statusIcon}"></i>
                        <span class="result-type">${result.action || 'SWAP'}</span>
                        <span class="result-time">${new Date(result.timestamp).toLocaleTimeString()}</span>
                        ${result.swapNumber ? `<span class="result-swap-number">#${result.swapNumber}</span>` : ''}
                    </div>
                    <div class="result-details">
                        <div class="result-pair">${result.tokenIn} → ${result.tokenOut}</div>
                        <div class="result-amount">Amount: ${result.amount}</div>
                    </div>
                    ${result.expectedAmountOut ? `
                        <div class="result-quote">
                            <span class="quote-label">Expected:</span>
                            <span class="quote-value">${result.expectedAmountOut} ${result.tokenOut}</span>
                            ${result.minAmountOut ? `<span class="quote-threshold">(Min: ${result.minAmountOut})</span>` : ''}
                        </div>
                    ` : ''}
                    ${result.amountOut ? `
                        <div class="result-executed">
                            <span class="executed-label">Actual:</span>
                            <span class="executed-value">${result.amountOut} ${result.tokenOut}</span>
                        </div>
                    ` : ''}
                    ${result.transactionHash ? `
                        <div class="result-tx">
                            <span class="tx-label">TX:</span>
                            <span class="tx-hash">${result.transactionHash.substring(0, 10)}...</span>
                        </div>
                    ` : ''}
                    ${result.reason ? `<div class="result-reason">${result.reason}</div>` : ''}
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHtml;
    }
}

// Collapsible Panel Functionality
function togglePanel(panelId) {
    const panel = document.querySelector(`.${panelId}`);
    const content = panel.querySelector('.collapsible-content');
    const toggle = panel.querySelector('.collapse-toggle i');
    
    if (content.classList.contains('collapsed')) {
        // Expand
        content.classList.remove('collapsed');
        panel.classList.remove('collapsed');
        toggle.style.transform = 'rotate(0deg)';
    } else {
        // Collapse
        content.classList.add('collapsed');
        panel.classList.add('collapsed');
        toggle.style.transform = 'rotate(-90deg)';
    }
}

// Initialize the web interface when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GalaSwapWebInterface();
});
