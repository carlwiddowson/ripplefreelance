/**
 * Check-based Escrow Service for RLUSD
 * 
 * XRPL native escrows only support XRP. For RLUSD, we use Checks as an alternative.
 * Checks allow the sender to create a deferred payment that the recipient can cash
 * only when conditions are met (similar to escrow but for tokens).
 */

import { CheckCreate, CheckCash, CheckCancel } from 'xrpl';
import { createHash, randomBytes } from 'crypto';
import { getXRPLClient } from './client';
import { logger } from '../utils/logger';
import { Currency, formatCurrencyAmount, getRLUSDIssuer } from './config';

export interface CheckEscrowParams {
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: Currency;
  invoiceID?: string; // Used to link check to gig/milestone
  memo?: string;
}

export interface ConditionalCheck {
  invoiceID: string;
  checkID?: string; // Set after check is created on ledger
}

export class CheckEscrowService {
  /**
   * Generate a unique invoice ID for linking check to gig
   */
  generateInvoiceID(): string {
    return randomBytes(32).toString('hex').toUpperCase();
  }

  /**
   * Create a Check for RLUSD payment
   * This acts as an escrow - the freelancer can only cash it when approved
   */
  async createCheck(params: CheckEscrowParams): Promise<CheckCreate> {
    const { fromAddress, toAddress, amount, currency, invoiceID, memo } = params;

    // Format amount based on currency
    const amountFormatted = formatCurrencyAmount(amount.toString(), currency);

    const check: CheckCreate = {
      TransactionType: 'CheckCreate',
      Account: fromAddress,
      Destination: toAddress,
      SendMax: amountFormatted as any,
    };

    // Add invoice ID to track the check
    if (invoiceID) {
      check.InvoiceID = invoiceID;
    }

    // Add memo if provided
    if (memo) {
      check.Memos = [
        {
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
            MemoType: Buffer.from('escrow', 'utf8').toString('hex').toUpperCase(),
          },
        },
      ];
    }

    logger.info(`Created check escrow: ${fromAddress} -> ${toAddress}, ${amount} ${currency}`);

    return check;
  }

  /**
   * Create a milestone-based check escrow for RLUSD
   * This is the RLUSD equivalent of createMilestoneEscrow
   */
  async createMilestoneCheck(
    clientAddress: string,
    freelancerAddress: string,
    amount: number,
    currency: Currency,
    gigId: string,
  ): Promise<{ check: CheckCreate; invoiceID: string }> {
    // Generate unique invoice ID for this milestone
    const invoiceID = this.generateInvoiceID();

    const memo = `Milestone payment for gig ${gigId}`;

    const check = await this.createCheck({
      fromAddress: clientAddress,
      toAddress: freelancerAddress,
      amount,
      currency,
      invoiceID,
      memo,
    });

    logger.info(`Created milestone check: ${clientAddress} -> ${freelancerAddress}, ${amount} ${currency}`);

    return { check, invoiceID };
  }

  /**
   * Cash a check (equivalent to EscrowFinish)
   * The freelancer calls this to claim funds after work is approved
   */
  async cashCheck(
    recipientAddress: string,
    checkID: string,
    amount?: number,
    currency?: Currency,
  ): Promise<CheckCash> {
    const cash: CheckCash = {
      TransactionType: 'CheckCash',
      Account: recipientAddress,
      CheckID: checkID,
    };

    // Optional: specify exact amount to cash (can be less than SendMax)
    if (amount && currency) {
      const amountFormatted = formatCurrencyAmount(amount.toString(), currency);
      cash.Amount = amountFormatted as any;
    }

    logger.info(`Cashing check: ${checkID} by ${recipientAddress}`);

    return cash;
  }

  /**
   * Cancel a check (equivalent to EscrowCancel)
   * The client calls this to cancel and reclaim funds if work is not delivered
   */
  async cancelCheck(
    accountAddress: string,
    checkID: string,
  ): Promise<CheckCancel> {
    const cancel: CheckCancel = {
      TransactionType: 'CheckCancel',
      Account: accountAddress,
      CheckID: checkID,
    };

    logger.info(`Cancelling check: ${checkID} by ${accountAddress}`);

    return cancel;
  }

  /**
   * Submit a check transaction
   */
  async submitCheckTransaction(transaction: CheckCreate | CheckCash | CheckCancel): Promise<any> {
    const xrplClient = getXRPLClient();
    const client = xrplClient.getClient();
    const wallet = xrplClient.getWallet();

    try {
      const prepared = await client.autofill(transaction);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      logger.info(`Check transaction submitted: ${result.result.hash}`);

      // Extract check ID from metadata if this is a CheckCreate
      let checkID: string | undefined;
      if (transaction.TransactionType === 'CheckCreate' && result.result.meta) {
        const meta = result.result.meta as any;
        if (meta.CreatedNode) {
          const checkNode = meta.CreatedNode.find((node: any) => 
            node.LedgerEntryType === 'Check'
          );
          if (checkNode) {
            checkID = checkNode.LedgerIndex;
          }
        }
      }

      return {
        success: true,
        hash: result.result.hash,
        checkID,
        result: result.result,
      };
    } catch (error) {
      logger.error('Check transaction failed:', error);
      throw error;
    }
  }

  /**
   * Get all checks for an account
   */
  async getAccountChecks(accountAddress: string): Promise<any[]> {
    const client = getXRPLClient().getClient();

    try {
      const response = await client.request({
        command: 'account_objects',
        account: accountAddress,
        type: 'check',
      });

      return response.result.account_objects;
    } catch (error) {
      logger.error(`Failed to get checks for ${accountAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific check by ID
   */
  async getCheck(checkID: string): Promise<any> {
    const client = getXRPLClient().getClient();

    try {
      const response = await client.request({
        command: 'ledger_entry',
        check: checkID,
      });

      return response.result.node;
    } catch (error) {
      logger.error(`Failed to get check ${checkID}:`, error);
      throw error;
    }
  }

  /**
   * Find check by invoice ID
   */
  async findCheckByInvoiceID(accountAddress: string, invoiceID: string): Promise<any | null> {
    const checks = await this.getAccountChecks(accountAddress);
    return checks.find((check: any) => check.InvoiceID === invoiceID) || null;
  }
}

export const checkEscrowService = new CheckEscrowService();
