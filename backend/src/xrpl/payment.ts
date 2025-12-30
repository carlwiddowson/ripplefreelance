import { Payment, xrpToDrops } from 'xrpl';
import { getXRPLClient } from './client';
import { logger } from '../utils/logger';
import { Currency, getRLUSDIssuer } from './config';
import { convertCurrency, getExchangeRate } from './amm';

export interface PaymentParams {
  fromAddress: string;
  toAddress: string;
  amount: number; // In XRP or RLUSD
  currency: Currency;
  destinationTag?: number;
  memo?: string;
}

export class PaymentService {
  /**
   * Create a payment transaction for any supported currency
   */
  async createPayment(params: PaymentParams): Promise<Payment> {
    const { fromAddress, toAddress, amount, currency, destinationTag, memo } = params;

    const payment: Payment = {
      TransactionType: 'Payment',
      Account: fromAddress,
      Destination: toAddress,
      Amount: currency === Currency.XRP 
        ? xrpToDrops(amount)
        : {
            currency: 'RLUSD',
            value: amount.toString(),
            issuer: getRLUSDIssuer(),
          },
    };

    if (destinationTag) {
      payment.DestinationTag = destinationTag;
    }

    if (memo) {
      payment.Memos = [
        {
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
            MemoType: Buffer.from('payment', 'utf8').toString('hex').toUpperCase(),
          },
        },
      ];
    }

    return payment;
  }

  /**
   * Create a payment transaction for XRP (backward compatibility)
   */
  async createXRPPayment(params: Omit<PaymentParams, 'currency'>): Promise<Payment> {
    return this.createPayment({ ...params, currency: Currency.XRP });
  }

  /**
   * Create a payment transaction for RLUSD
   */
  async createRLUSDPayment(params: Omit<PaymentParams, 'currency'>): Promise<Payment> {
    return this.createPayment({ ...params, currency: Currency.RLUSD });
  }

  /**
   * Submit and wait for payment confirmation
   * Note: In production, the client will sign the transaction
   * This is for backend-initiated payments only (e.g., refunds)
   */
  async submitPayment(payment: Payment): Promise<any> {
    const xrplClient = getXRPLClient();
    const client = xrplClient.getClient();
    const wallet = xrplClient.getWallet();

    try {
      // Autofill transaction fields (Fee, Sequence, LastLedgerSequence)
      const prepared = await client.autofill(payment);
      
      // Sign the transaction
      const signed = wallet.sign(prepared);
      
      // Submit and wait for validation
      const result = await client.submitAndWait(signed.tx_blob);

      logger.info(`Payment submitted: ${result.result.hash}`);

      return {
        success: true,
        hash: result.result.hash,
        result: result.result,
      };
    } catch (error) {
      logger.error('Payment submission failed:', error);
      throw error;
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransaction(hash: string): Promise<any> {
    const client = getXRPLClient().getClient();

    try {
      const response = await client.request({
        command: 'tx',
        transaction: hash,
      });

      return response.result;
    } catch (error) {
      logger.error(`Failed to get transaction ${hash}:`, error);
      throw error;
    }
  }

  /**
   * Convert between currencies using AMM rates
   */
  async convertCurrencyAmount(
    amount: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ): Promise<number> {
    const client = getXRPLClient().getClient();
    return convertCurrency(client, amount, fromCurrency, toCurrency);
  }

  /**
   * Get current exchange rate between currencies
   */
  async getRate(fromCurrency: Currency, toCurrency: Currency): Promise<number> {
    const client = getXRPLClient().getClient();
    const rate = await getExchangeRate(client, fromCurrency, toCurrency);
    return rate?.rate ?? 0;
  }

  /**
   * Convert USD to XRP using current exchange rate
   * Note: In production, use a real exchange rate API or RLUSD as proxy
   */
  async convertUSDtoXRP(usdAmount: number): Promise<number> {
    // If RLUSD AMM pool exists, use it (RLUSD ≈ 1 USD)
    try {
      const client = getXRPLClient().getClient();
      return await convertCurrency(client, usdAmount, Currency.RLUSD, Currency.XRP);
    } catch (error) {
      // Fallback to mock rate if AMM not available
      const MOCK_XRP_PRICE_USD = 0.50; // $0.50 per XRP
      return usdAmount / MOCK_XRP_PRICE_USD;
    }
  }

  /**
   * Convert XRP to USD using current exchange rate
   */
  async convertXRPtoUSD(xrpAmount: number): Promise<number> {
    try {
      const client = getXRPLClient().getClient();
      return await convertCurrency(client, xrpAmount, Currency.XRP, Currency.RLUSD);
    } catch (error) {
      const MOCK_XRP_PRICE_USD = 0.50;
      return xrpAmount * MOCK_XRP_PRICE_USD;
    }
  }

  /**
   * Validate XRPL address format
   */
  isValidAddress(address: string): boolean {
    // XRPL addresses start with 'r' and are 25-35 characters
    const addressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
    return addressRegex.test(address);
  }
}

export const paymentService = new PaymentService();
