import { Payment, xrpToDrops, dropsToXrp as _dropsToXrp } from 'xrpl';
import { getXRPLClient } from './client';
import { logger } from '../utils/logger';

export interface PaymentParams {
  fromAddress: string;
  toAddress: string;
  amount: number; // In XRP or RLUSD
  currency?: 'XRP' | 'RLUSD';
  destinationTag?: number;
  memo?: string;
}

export interface RLUSDPaymentParams extends PaymentParams {
  currency: 'RLUSD';
  issuerAddress: string; // RLUSD issuer address
}

export class PaymentService {
  /**
   * Create a payment transaction for XRP
   */
  async createXRPPayment(params: PaymentParams): Promise<Payment> {
    const { fromAddress, toAddress, amount, destinationTag, memo } = params;

    const payment: Payment = {
      TransactionType: 'Payment',
      Account: fromAddress,
      Destination: toAddress,
      Amount: xrpToDrops(amount),
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
   * Create a payment transaction for RLUSD stablecoin
   */
  async createRLUSDPayment(params: RLUSDPaymentParams): Promise<Payment> {
    const { fromAddress, toAddress, amount, issuerAddress, destinationTag, memo } = params;

    const payment: Payment = {
      TransactionType: 'Payment',
      Account: fromAddress,
      Destination: toAddress,
      Amount: {
        currency: 'RLUSD',
        value: amount.toString(),
        issuer: issuerAddress,
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
   * Convert USD to XRP using current exchange rate
   * Note: In production, use a real exchange rate API
   */
  async convertUSDtoXRP(usdAmount: number): Promise<number> {
    // Mock exchange rate - in production, fetch from API (e.g., CoinGecko, CryptoCompare)
    const MOCK_XRP_PRICE_USD = 0.50; // $0.50 per XRP
    return usdAmount / MOCK_XRP_PRICE_USD;
  }

  /**
   * Convert XRP to USD using current exchange rate
   */
  async convertXRPtoUSD(xrpAmount: number): Promise<number> {
    const MOCK_XRP_PRICE_USD = 0.50;
    return xrpAmount * MOCK_XRP_PRICE_USD;
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
