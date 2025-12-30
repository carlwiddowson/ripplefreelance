/**
 * XRPL AMM (Automated Market Maker) Service
 * 
 * Handles AMM pool queries, price fetching, and currency conversion
 */

import { Client } from 'xrpl';
import { logger } from '../utils/logger';
import { Currency, getCurrencyConfig } from './config';

export interface AMMInfo {
  account: string;
  asset1: {
    currency: string;
    issuer?: string;
  };
  asset2: {
    currency: string;
    issuer?: string;
  };
  amount1: string;
  amount2: string;
  lpTokenBalance: string;
  tradingFee: number;
}

export interface ExchangeRate {
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number; // Amount of toCurrency per 1 unit of fromCurrency
  timestamp: number;
}

/**
 * Get AMM info for a currency pair
 */
export async function getAMMInfo(
  client: Client,
  currency1: Currency,
  currency2: Currency
): Promise<AMMInfo | null> {
  try {
    const config1 = getCurrencyConfig(currency1);
    const config2 = getCurrencyConfig(currency2);

    // Build asset objects for AMM query
    const asset1: any = { currency: config1.code };
    if (config1.issuer) {
      asset1.issuer = config1.issuer;
    }

    const asset2: any = { currency: config2.code };
    if (config2.issuer) {
      asset2.issuer = config2.issuer;
    }

    const response = await client.request({
      command: 'amm_info',
      asset: asset1,
      asset2: asset2,
      ledger_index: 'validated',
    });

    const ammData = response.result.amm;

    const asset1Value = typeof ammData.amount === 'string' ? { currency: 'XRP' } : ammData.amount;
    const asset2Value = typeof ammData.amount2 === 'string' ? { currency: 'XRP' } : ammData.amount2;

    return {
      account: ammData.account,
      asset1: asset1Value,
      asset2: asset2Value,
      amount1: typeof ammData.amount === 'string' ? ammData.amount : ammData.amount.value,
      amount2: typeof ammData.amount2 === 'string' ? ammData.amount2 : ammData.amount2.value,
      lpTokenBalance: ammData.lp_token.value,
      tradingFee: ammData.trading_fee,
    };
  } catch (error: any) {
    if (error?.data?.error === 'actNotFound') {
      logger.warn(`AMM pool not found for ${currency1}/${currency2}`);
      return null;
    }
    logger.error(`Failed to get AMM info for ${currency1}/${currency2}:`, error);
    throw error;
  }
}

/**
 * Get current exchange rate between two currencies from AMM
 */
export async function getExchangeRate(
  client: Client,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<ExchangeRate | null> {
  try {
    const ammInfo = await getAMMInfo(client, fromCurrency, toCurrency);

    if (!ammInfo) {
      return null;
    }

    // Calculate rate: amount of toCurrency per 1 unit of fromCurrency
    // AMM uses constant product formula: x * y = k
    // Rate = asset2_amount / asset1_amount (if from=asset1, to=asset2)
    const amount1 = parseFloat(ammInfo.amount1);
    const amount2 = parseFloat(ammInfo.amount2);

    const config1 = getCurrencyConfig(fromCurrency);
    const ammAsset1Currency = typeof ammInfo.asset1 === 'object' && 'currency' in ammInfo.asset1
      ? ammInfo.asset1.currency
      : 'XRP';

    // Determine if we need to invert the rate based on asset order
    const rate = ammAsset1Currency === config1.code
      ? amount2 / amount1
      : amount1 / amount2;

    return {
      fromCurrency,
      toCurrency,
      rate,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Failed to get exchange rate for ${fromCurrency}/${toCurrency}:`, error);
    throw error;
  }
}

/**
 * Convert amount from one currency to another using AMM rates
 */
export async function convertCurrency(
  client: Client,
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  try {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const exchangeRate = await getExchangeRate(client, fromCurrency, toCurrency);

    if (!exchangeRate) {
      throw new Error(`No AMM pool found for ${fromCurrency}/${toCurrency}`);
    }

    return amount * exchangeRate.rate;
  } catch (error) {
    logger.error(`Failed to convert ${amount} ${fromCurrency} to ${toCurrency}:`, error);
    throw error;
  }
}

/**
 * Get XRP/RLUSD exchange rate specifically
 */
export async function getXRPRLUSDRate(client: Client): Promise<number> {
  const rate = await getExchangeRate(client, Currency.XRP, Currency.RLUSD);
  if (!rate) {
    throw new Error('XRP/RLUSD AMM pool not available');
  }
  return rate.rate;
}

/**
 * Get RLUSD/XRP exchange rate specifically
 */
export async function getRLUSDXRPRate(client: Client): Promise<number> {
  const rate = await getExchangeRate(client, Currency.RLUSD, Currency.XRP);
  if (!rate) {
    throw new Error('RLUSD/XRP AMM pool not available');
  }
  return rate.rate;
}

/**
 * Convert XRP to RLUSD
 */
export async function convertXRPToRLUSD(client: Client, xrpAmount: number): Promise<number> {
  return convertCurrency(client, xrpAmount, Currency.XRP, Currency.RLUSD);
}

/**
 * Convert RLUSD to XRP
 */
export async function convertRLUSDToXRP(client: Client, rlusdAmount: number): Promise<number> {
  return convertCurrency(client, rlusdAmount, Currency.RLUSD, Currency.XRP);
}

/**
 * Get price impact for a swap (useful for larger trades)
 * Returns the percentage price impact (e.g., 0.05 = 5%)
 */
export async function getPriceImpact(
  client: Client,
  inputAmount: number,
  inputCurrency: Currency,
  outputCurrency: Currency
): Promise<number> {
  try {
    const ammInfo = await getAMMInfo(client, inputCurrency, outputCurrency);

    if (!ammInfo) {
      throw new Error(`AMM pool not found for ${inputCurrency}/${outputCurrency}`);
    }

    const reserves1 = parseFloat(ammInfo.amount1);
    const reserves2 = parseFloat(ammInfo.amount2);

    // Calculate output amount using constant product formula
    // outputAmount = (inputAmount * reserves2) / (reserves1 + inputAmount)
    const outputAmount = (inputAmount * reserves2) / (reserves1 + inputAmount);

    // Calculate spot price and execution price
    const spotPrice = reserves2 / reserves1;
    const executionPrice = outputAmount / inputAmount;

    // Price impact = (spotPrice - executionPrice) / spotPrice
    const priceImpact = Math.abs((spotPrice - executionPrice) / spotPrice);

    return priceImpact;
  } catch (error) {
    logger.error(`Failed to calculate price impact:`, error);
    throw error;
  }
}

/**
 * Check if AMM pool exists for a currency pair
 */
export async function ammPoolExists(
  client: Client,
  currency1: Currency,
  currency2: Currency
): Promise<boolean> {
  const ammInfo = await getAMMInfo(client, currency1, currency2);
  return ammInfo !== null;
}
