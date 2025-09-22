import { CicadaBot } from '../src/CicadaBot';
import { loadConfig, validateConfig } from '../src/utils/config';
import { Logger } from '../src/utils/logger';
import { COMMON_TOKENS, FEE_TIERS } from '../src/constants/tokens';

/**
 * Debug script to analyze arbitrage logic and quote differences
 */
async function debugArbitrageLogic() {
  try {
    const config = loadConfig();
    validateConfig(config);
    
    Logger.info('🔍 Debugging Arbitrage Logic...');

    const bot = new CicadaBot(config);
    await bot.initialize();
    
    Logger.info('✅ Bot initialized successfully');

    const testAmount = '10';
    const workingFeeTiers = [
      { tier: FEE_TIERS.LOW, name: '0.05%' },
      { tier: FEE_TIERS.HIGH, name: '1.00%' }
    ];

    Logger.info('📊 Getting quotes for analysis...');

    const quotes = [];

    // Get quotes from working fee tiers
    for (const { tier, name } of workingFeeTiers) {
      try {
        const quote = await bot.getQuote({
          tokenIn: COMMON_TOKENS.GALA,
          tokenOut: COMMON_TOKENS.GUSDC,
          amountIn: testAmount,
          slippageTolerance: 1.0,
          feeTier: tier
        });

        quotes.push({
          feeTier: tier,
          name,
          amountOut: quote.amountOut,
          priceImpact: quote.priceImpact
        });

        Logger.info(`✅ ${name} fee tier: ${quote.amountOut} USDC (impact: ${quote.priceImpact})`);

      } catch (error) {
        Logger.error(`❌ ${name} fee tier failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    if (quotes.length >= 2) {
      Logger.info('📈 Analyzing arbitrage potential...');
      
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
      const profitPercentage = (potentialProfit / parseFloat(testAmount)) * 100;

      Logger.info('📊 Arbitrage Analysis:', {
        bestBuy: `${bestBuy.name}: ${bestBuy.amountOut} USDC`,
        bestSell: `${bestSell.name}: ${bestSell.amountOut} USDC`,
        potentialProfit: `${potentialProfit.toFixed(6)} USDC`,
        profitPercentage: `${profitPercentage.toFixed(4)}%`,
        minThreshold: '0.1%'
      });

      if (profitPercentage >= 0.1) {
        Logger.info('💰 PROFITABLE ARBITRAGE OPPORTUNITY FOUND!');
      } else {
        Logger.info('❌ No profitable arbitrage (below 0.1% threshold)');
      }

      // Now let's check the reverse direction
      Logger.info('🔄 Checking reverse direction (USDC -> GALA)...');
      
      const reverseQuotes = [];
      for (const { tier, name } of workingFeeTiers) {
        try {
          const quote = await bot.getQuote({
            tokenIn: COMMON_TOKENS.GUSDC,
            tokenOut: COMMON_TOKENS.GALA,
            amountIn: '1', // 1 USDC
            slippageTolerance: 1.0,
            feeTier: tier
          });

          reverseQuotes.push({
            feeTier: tier,
            name,
            amountOut: quote.amountOut,
            priceImpact: quote.priceImpact
          });

          Logger.info(`✅ ${name} fee tier (reverse): ${quote.amountOut} GALA for 1 USDC`);

        } catch (error) {
          Logger.error(`❌ ${name} fee tier (reverse) failed:`, error instanceof Error ? error.message : String(error));
        }
      }

      if (reverseQuotes.length >= 2) {
        const bestBuyReverse = reverseQuotes.reduce((best, current) => 
          parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
        );

        const bestSellReverse = reverseQuotes.reduce((best, current) => 
          parseFloat(current.amountOut) < parseFloat(best.amountOut) ? current : best
        );

        const buyOutputReverse = parseFloat(bestBuyReverse.amountOut);
        const sellOutputReverse = parseFloat(bestSellReverse.amountOut);
        const potentialProfitReverse = buyOutputReverse - sellOutputReverse;
        const profitPercentageReverse = (potentialProfitReverse / 1) * 100; // 1 USDC

        Logger.info('📊 Reverse Arbitrage Analysis:', {
          bestBuy: `${bestBuyReverse.name}: ${bestBuyReverse.amountOut} GALA for 1 USDC`,
          bestSell: `${bestSellReverse.name}: ${bestSellReverse.amountOut} GALA for 1 USDC`,
          potentialProfit: `${potentialProfitReverse.toFixed(6)} GALA`,
          profitPercentage: `${profitPercentageReverse.toFixed(4)}%`
        });

        if (profitPercentageReverse >= 0.1) {
          Logger.info('💰 PROFITABLE REVERSE ARBITRAGE OPPORTUNITY FOUND!');
        } else {
          Logger.info('❌ No profitable reverse arbitrage (below 0.1% threshold)');
        }
      }

    } else {
      Logger.error('❌ Not enough working fee tiers for arbitrage analysis');
    }

    await bot.disconnect();
    Logger.info('✅ Debug analysis completed');

  } catch (error) {
    Logger.error('❌ Debug analysis failed', error);
  }
}

// Run the debug
if (require.main === module) {
  debugArbitrageLogic().catch((error) => {
    Logger.error('Unhandled error in debug analysis', error);
    process.exit(1);
  });
}
