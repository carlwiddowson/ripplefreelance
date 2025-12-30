/**
 * XRPL Currency Configuration
 * 
 * Contains configuration for XRP and RLUSD currencies on XRPL
 */

export enum Currency {
  XRP = 'XRP',
  RLUSD = 'RLUSD',
  REPTOKEN = 'REPTOKEN',
}

export interface CurrencyConfig {
  code: string;
  issuer?: string; // XRP has no issuer
  displayName: string;
  decimals: number;
}

/**
 * RLUSD issuer address on XRPL Testnet
 * Source: https://docs.ripple.com/stablecoin/developer-resources/rlusd-on-the-xrpl/
 */
export const RLUSD_TESTNET_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';

/**
 * RLUSD issuer address on XRPL Mainnet
 * TODO: Update with mainnet issuer when deploying to production
 */
export const RLUSD_MAINNET_ISSUER = 'rN7n7otQDd6FczFgLdlqtyMVrn3HMfXxJa'; // Placeholder

/**
 * RepToken issuer address on XRPL Testnet
 * RepToken is the platform's reputation token
 * TODO: Generate actual issuer account for testnet
 */
export const REPTOKEN_TESTNET_ISSUER = 'rREPT0KEN1234567890TESTNET12345'; // Placeholder

/**
 * RepToken issuer address on XRPL Mainnet
 * TODO: Create mainnet issuer when deploying to production
 */
export const REPTOKEN_MAINNET_ISSUER = 'rREPT0KEN1234567890MAINNET12345'; // Placeholder

/**
 * Currency configurations
 */
export const CURRENCY_CONFIG: Record<Currency, CurrencyConfig> = {
  [Currency.XRP]: {
    code: 'XRP',
    displayName: 'XRP',
    decimals: 6,
  },
  [Currency.RLUSD]: {
    code: 'RLUSD',
    issuer: process.env.NODE_ENV === 'production' ? RLUSD_MAINNET_ISSUER : RLUSD_TESTNET_ISSUER,
    displayName: 'Ripple USD',
    decimals: 6,
  },
  [Currency.REPTOKEN]: {
    code: 'REP',
    issuer: process.env.NODE_ENV === 'production' ? REPTOKEN_MAINNET_ISSUER : REPTOKEN_TESTNET_ISSUER,
    displayName: 'Reputation Token',
    decimals: 6,
  },
};

/**
 * Get currency configuration
 */
export function getCurrencyConfig(currency: Currency): CurrencyConfig {
  return CURRENCY_CONFIG[currency];
}

/**
 * Get RLUSD issuer for current environment
 */
export function getRLUSDIssuer(): string {
  return process.env.NODE_ENV === 'production' ? RLUSD_MAINNET_ISSUER : RLUSD_TESTNET_ISSUER;
}

/**
 * Format currency amount for XRPL API
 */
export function formatCurrencyAmount(amount: string, currency: Currency): string | object {
  const config = getCurrencyConfig(currency);
  
  if (currency === Currency.XRP) {
    // XRP amounts are in drops (1 XRP = 1,000,000 drops)
    const drops = (parseFloat(amount) * 1_000_000).toString();
    return drops;
  } else {
    // Token amounts are objects
    return {
      currency: config.code,
      issuer: config.issuer,
      value: amount,
    };
  }
}

/**
 * Parse currency amount from XRPL API response
 */
export function parseCurrencyAmount(amount: string | object): { value: number; currency: Currency } {
  if (typeof amount === 'string') {
    // XRP in drops
    return {
      value: parseInt(amount) / 1_000_000,
      currency: Currency.XRP,
    };
  } else if (typeof amount === 'object' && 'value' in amount) {
    // Token amount
    const tokenAmount = amount as { value: string; currency: string; issuer: string };
    return {
      value: parseFloat(tokenAmount.value),
      currency: tokenAmount.currency === 'RLUSD' ? Currency.RLUSD : Currency.XRP,
    };
  }
  throw new Error('Invalid currency amount format');
}
