/**
 * XRPL Trustline Utility
 * 
 * Handles trustline checking and creation for RLUSD and other tokens
 */

import { Client, TrustSet } from 'xrpl';
import { logger } from '../utils/logger';
import { Currency, getRLUSDIssuer, getCurrencyConfig } from './config';

export interface TrustlineInfo {
  hasTrustline: boolean;
  limit: string;
  balance: string;
  currency: string;
  issuer: string;
}

/**
 * Check if an account has a trustline for a specific currency
 */
export async function checkTrustline(
  client: Client,
  accountAddress: string,
  currency: Currency
): Promise<TrustlineInfo | null> {
  try {
    if (currency === Currency.XRP) {
      // XRP doesn't require trustlines
      return null;
    }

    const config = getCurrencyConfig(currency);
    const issuer = config.issuer!;

    const response = await client.request({
      command: 'account_lines',
      account: accountAddress,
      ledger_index: 'validated',
    });

    const trustline = response.result.lines.find(
      (line: any) => line.currency === config.code && line.account === issuer
    );

    if (trustline) {
      return {
        hasTrustline: true,
        limit: trustline.limit,
        balance: trustline.balance,
        currency: config.code,
        issuer,
      };
    }

    return {
      hasTrustline: false,
      limit: '0',
      balance: '0',
      currency: config.code,
      issuer,
    };
  } catch (error) {
    logger.error(`Failed to check trustline for ${accountAddress}:`, error);
    throw error;
  }
}

/**
 * Generate a TrustSet transaction payload for creating/updating a trustline
 * Returns unsigned transaction that must be signed by the user's wallet
 */
export async function generateTrustSetTransaction(
  client: Client,
  accountAddress: string,
  currency: Currency,
  limit: string = '100000' // Default limit: 100,000 RLUSD
): Promise<TrustSet> {
  try {
    if (currency === Currency.XRP) {
      throw new Error('XRP does not require trustlines');
    }

    const config = getCurrencyConfig(currency);
    const issuer = config.issuer!;

    // Prepare TrustSet transaction
    const trustSetTx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: accountAddress,
      LimitAmount: {
        currency: config.code,
        issuer,
        value: limit,
      },
    };

    // Auto-fill transaction fields (Fee, Sequence, LastLedgerSequence)
    const prepared = await client.autofill(trustSetTx);

    logger.info(`Generated TrustSet transaction for ${accountAddress}:`, {
      currency: config.code,
      issuer,
      limit,
    });

    return prepared;
  } catch (error) {
    logger.error(`Failed to generate TrustSet transaction:`, error);
    throw error;
  }
}

/**
 * Get all trustlines for an account
 */
export async function getAccountTrustlines(
  client: Client,
  accountAddress: string
): Promise<TrustlineInfo[]> {
  try {
    const response = await client.request({
      command: 'account_lines',
      account: accountAddress,
      ledger_index: 'validated',
    });

    return response.result.lines.map((line: any) => ({
      hasTrustline: true,
      limit: line.limit,
      balance: line.balance,
      currency: line.currency,
      issuer: line.account,
    }));
  } catch (error) {
    logger.error(`Failed to get trustlines for ${accountAddress}:`, error);
    throw error;
  }
}

/**
 * Check if account has RLUSD trustline specifically
 */
export async function hasRLUSDTrustline(
  client: Client,
  accountAddress: string
): Promise<boolean> {
  const trustline = await checkTrustline(client, accountAddress, Currency.RLUSD);
  return trustline?.hasTrustline ?? false;
}

/**
 * Get RLUSD balance for an account
 * Returns 0 if no trustline exists
 */
export async function getRLUSDBalance(
  client: Client,
  accountAddress: string
): Promise<number> {
  try {
    const trustline = await checkTrustline(client, accountAddress, Currency.RLUSD);
    
    if (!trustline || !trustline.hasTrustline) {
      return 0;
    }

    return parseFloat(trustline.balance);
  } catch (error) {
    logger.error(`Failed to get RLUSD balance for ${accountAddress}:`, error);
    return 0;
  }
}

/**
 * Generate TrustSet transaction for RLUSD specifically
 */
export async function generateRLUSDTrustSetTransaction(
  client: Client,
  accountAddress: string,
  limit: string = '100000'
): Promise<TrustSet> {
  return generateTrustSetTransaction(client, accountAddress, Currency.RLUSD, limit);
}
