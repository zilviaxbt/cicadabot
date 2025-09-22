"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const CicadaBot_1 = require("../src/CicadaBot");
const config_1 = require("../src/utils/config");
const logger_1 = require("../src/utils/logger");
const tokens_1 = require("../src/constants/tokens");
const readline = __importStar(require("readline"));
/**
 * Interactive Trading Script for Cicada Bot
 * Allows you to execute swaps with your GALA balance
 */
class TradingScript {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    async initialize() {
        try {
            // Load configuration
            const config = (0, config_1.loadConfig)();
            (0, config_1.validateConfig)(config);
            logger_1.Logger.info('🚀 Initializing Cicada Bot Trading Script...');
            // Initialize bot
            this.bot = new CicadaBot_1.CicadaBot(config);
            await this.bot.initialize();
            logger_1.Logger.info('✅ Bot initialized successfully');
            logger_1.Logger.info(`💰 Wallet: ${config.walletAddress}`);
            logger_1.Logger.info('📊 Current GALA/USDC price: ~$0.0178');
        }
        catch (error) {
            logger_1.Logger.error('❌ Failed to initialize bot', error);
            throw error;
        }
    }
    async showMenu() {
        console.log('\n' + '='.repeat(50));
        console.log('🎯 GalaSwap Trading Bot - Main Menu');
        console.log('='.repeat(50));
        console.log('1. 💰 Get Quote (GALA → USDC)');
        console.log('2. 🔄 Execute Swap (GALA → USDC)');
        console.log('3. 📊 Get Current Price');
        console.log('4. 📈 Test Different Amounts');
        console.log('5. ⚙️  Show Bot Status');
        console.log('6. ❌ Exit');
        console.log('='.repeat(50));
    }
    async getQuote() {
        const amount = await this.askQuestion('Enter GALA amount to quote: ');
        if (!amount || isNaN(parseFloat(amount))) {
            console.log('❌ Invalid amount');
            return;
        }
        try {
            logger_1.Logger.info(`📊 Getting quote for ${amount} GALA...`);
            const quote = await this.bot.getQuote({
                tokenIn: tokens_1.COMMON_TOKENS.GALA,
                tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                amountIn: amount,
                slippageTolerance: 0.5,
                feeTier: tokens_1.FEE_TIERS.LOW
            });
            console.log('\n📊 Quote Results:');
            console.log(`💰 ${amount} GALA → ${quote.amountOut} USDC`);
            console.log(`📈 Price Impact: ${quote.priceImpact}%`);
            console.log(`💸 Fee Tier: ${quote.feeTier} (${quote.feeTier / 100}%)`);
            console.log(`💵 Current Price: ${quote.currentPrice}`);
            console.log(`💵 New Price: ${quote.newPrice}`);
            const effectivePrice = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);
            console.log(`🎯 Effective Price: 1 GALA = ${effectivePrice.toFixed(6)} USDC`);
        }
        catch (error) {
            logger_1.Logger.error('❌ Quote failed:', error instanceof Error ? error.message : String(error));
        }
    }
    async executeSwap() {
        const amount = await this.askQuestion('Enter GALA amount to swap: ');
        if (!amount || isNaN(parseFloat(amount))) {
            console.log('❌ Invalid amount');
            return;
        }
        const slippage = await this.askQuestion('Enter slippage tolerance (default 1.0%): ') || '1.0';
        if (isNaN(parseFloat(slippage))) {
            console.log('❌ Invalid slippage');
            return;
        }
        // Safety check
        if (parseFloat(amount) > 100) {
            const confirm = await this.askQuestion(`⚠️  You're about to swap ${amount} GALA (${(parseFloat(amount) * 0.0178).toFixed(2)} USD). Continue? (yes/no): `);
            if (confirm.toLowerCase() !== 'yes') {
                console.log('❌ Swap cancelled');
                return;
            }
        }
        try {
            logger_1.Logger.info(`🔄 Executing swap: ${amount} GALA → USDC...`);
            const result = await this.bot.executeSwap({
                tokenIn: tokens_1.COMMON_TOKENS.GALA,
                tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                amountIn: amount,
                slippageTolerance: parseFloat(slippage),
                feeTier: tokens_1.FEE_TIERS.LOW
            });
            if (result.success) {
                console.log('\n🎉 Swap Successful!');
                console.log(`💰 Swapped: ${result.amountIn} GALA → ${result.amountOut} USDC`);
                console.log(`🔗 Transaction: ${result.transactionHash}`);
                console.log(`📈 Price Impact: ${result.priceImpact}%`);
                console.log(`💸 Fee Tier: ${result.feeTier}`);
            }
            else {
                console.log('\n❌ Swap Failed:');
                console.log(`Error: ${result.error}`);
            }
        }
        catch (error) {
            logger_1.Logger.error('❌ Swap execution failed:', error instanceof Error ? error.message : String(error));
        }
    }
    async getCurrentPrice() {
        try {
            const price = await this.bot.getCurrentPrice(tokens_1.COMMON_TOKENS.GALA, tokens_1.COMMON_TOKENS.GUSDC);
            console.log(`\n💰 Current GALA/USDC Price: ${price}`);
            console.log(`💵 1 GALA = $${parseFloat(price).toFixed(6)}`);
        }
        catch (error) {
            logger_1.Logger.error('❌ Failed to get price:', error instanceof Error ? error.message : String(error));
        }
    }
    async testDifferentAmounts() {
        const amounts = ['10', '25', '50', '100', '200'];
        console.log('\n📊 Testing different amounts:');
        console.log('Amount (GALA) | USDC Output | Effective Price | Price Impact');
        console.log('-'.repeat(60));
        for (const amount of amounts) {
            try {
                const quote = await this.bot.getQuote({
                    tokenIn: tokens_1.COMMON_TOKENS.GALA,
                    tokenOut: tokens_1.COMMON_TOKENS.GUSDC,
                    amountIn: amount,
                    slippageTolerance: 0.5,
                    feeTier: tokens_1.FEE_TIERS.LOW
                });
                const effectivePrice = parseFloat(quote.amountOut) / parseFloat(quote.amountIn);
                console.log(`${amount.padStart(12)} | ${quote.amountOut.padStart(10)} | ${effectivePrice.toFixed(6).padStart(14)} | ${quote.priceImpact}%`);
            }
            catch (error) {
                console.log(`${amount.padStart(12)} | Failed to get quote`);
            }
        }
    }
    async showBotStatus() {
        const status = this.bot.getStatus();
        console.log('\n🤖 Bot Status:');
        console.log(`🔗 Connected: ${status.connected ? '✅' : '❌'}`);
        console.log(`💰 Wallet: ${status.walletAddress}`);
        console.log(`📊 Error Count: ${status.errorCount}`);
        console.log(`⏰ Last Activity: ${status.lastActivity || 'None'}`);
    }
    async askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }
    async run() {
        try {
            await this.initialize();
            while (true) {
                await this.showMenu();
                const choice = await this.askQuestion('\nSelect an option (1-6): ');
                switch (choice) {
                    case '1':
                        await this.getQuote();
                        break;
                    case '2':
                        await this.executeSwap();
                        break;
                    case '3':
                        await this.getCurrentPrice();
                        break;
                    case '4':
                        await this.testDifferentAmounts();
                        break;
                    case '5':
                        await this.showBotStatus();
                        break;
                    case '6':
                        console.log('\n👋 Goodbye!');
                        await this.cleanup();
                        return;
                    default:
                        console.log('❌ Invalid option. Please select 1-6.');
                }
                await this.askQuestion('\nPress Enter to continue...');
            }
        }
        catch (error) {
            logger_1.Logger.error('❌ Trading script failed', error);
        }
    }
    async cleanup() {
        await this.bot.disconnect();
        this.rl.close();
    }
}
// Run the trading script
async function main() {
    const script = new TradingScript();
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n👋 Shutting down...');
        await script.cleanup();
        process.exit(0);
    });
    await script.run();
}
if (require.main === module) {
    main().catch((error) => {
        logger_1.Logger.error('Unhandled error in trading script', error);
        process.exit(1);
    });
}
//# sourceMappingURL=trading-script.js.map