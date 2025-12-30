import { EscrowCreate, EscrowFinish, EscrowCancel, isoTimeToRippleTime, xrpToDrops } from 'xrpl';
import { createHash, randomBytes } from 'crypto';
import { getXRPLClient } from './client';
import { logger } from '../utils/logger';
import { Currency, formatCurrencyAmount } from './config';

export interface EscrowParams {
  fromAddress: string;
  toAddress: string;
  amount: number; // In XRP or RLUSD
  currency?: Currency;
  finishAfter?: Date; // Earliest finish time
  cancelAfter?: Date; // Expiration time
  condition?: string; // For conditional escrows
}

export interface ConditionalEscrow {
  condition: string;
  fulfillment: string;
}

export class EscrowService {
  /**
   * Generate a cryptographic condition and fulfillment pair
   * Used for oracle-based escrow releases
   */
  generateConditionFulfillment(): ConditionalEscrow {
    // Generate random 32-byte fulfillment
    const fulfillment = randomBytes(32);
    
    // Create SHA-256 hash as condition
    const condition = createHash('sha256')
      .update(fulfillment)
      .digest();

    return {
      condition: condition.toString('hex').toUpperCase(),
      fulfillment: fulfillment.toString('hex').toUpperCase(),
    };
  }

  /**
   * Create an escrow transaction
   * Note: XRPL native escrows only support XRP. For RLUSD, we use conditional payments.
   */
  async createEscrow(params: EscrowParams): Promise<EscrowCreate> {
    const { fromAddress, toAddress, amount, currency = Currency.XRP, finishAfter, cancelAfter, condition } = params;

    if (!cancelAfter) {
      throw new Error('CancelAfter is required for escrow');
    }

    // XRPL native escrows only support XRP
    if (currency !== Currency.XRP) {
      throw new Error('Native XRPL escrows only support XRP. For RLUSD, use conditional payments or Checks.');
    }

    const escrow: EscrowCreate = {
      TransactionType: 'EscrowCreate',
      Account: fromAddress,
      Destination: toAddress,
      Amount: xrpToDrops(amount),
      CancelAfter: isoTimeToRippleTime(cancelAfter.toISOString()),
    };

    if (finishAfter) {
      escrow.FinishAfter = isoTimeToRippleTime(finishAfter.toISOString());
    }

    if (condition) {
      escrow.Condition = condition;
    }

    return escrow;
  }

  /**
   * Create a milestone-based escrow with condition
   * This is the primary method for gig payments
   */
  async createMilestoneEscrow(
    clientAddress: string,
    freelancerAddress: string,
    amount: number,
    deliveryDate: Date,
    currency: Currency = Currency.XRP,
  ): Promise<{ escrow: EscrowCreate; fulfillment: string }> {
    // For RLUSD, we need to use an alternative approach (Checks or held payments)
    if (currency !== Currency.XRP) {
      throw new Error(
        'Native XRPL escrows only support XRP. ' +
        'For RLUSD milestone payments, use Check or conditional Payment. ' +
        'Consider converting RLUSD to XRP via AMM for escrow, or implement Check-based escrow.'
      );
    }

    // Generate condition/fulfillment pair
    const { condition, fulfillment } = this.generateConditionFulfillment();

    // Set FinishAfter to delivery date
    const finishAfter = deliveryDate;

    // Set CancelAfter to 30 days after delivery (refund window)
    const cancelAfter = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const escrow = await this.createEscrow({
      fromAddress: clientAddress,
      toAddress: freelancerAddress,
      amount,
      currency,
      finishAfter,
      cancelAfter,
      condition,
    });

    logger.info(`Created milestone escrow: ${clientAddress} -> ${freelancerAddress}, ${amount} ${currency}`);

    return { escrow, fulfillment };
  }

  /**
   * Finish (release) an escrow
   * Used when work is approved and funds should be released
   */
  async createEscrowFinish(
    finisherAddress: string,
    escrowCreatorAddress: string,
    escrowSequence: number,
    fulfillment?: string,
  ): Promise<EscrowFinish> {
    const finish: EscrowFinish = {
      TransactionType: 'EscrowFinish',
      Account: finisherAddress,
      Owner: escrowCreatorAddress,
      OfferSequence: escrowSequence,
    };

    if (fulfillment) {
      finish.Condition = fulfillment; // Note: In xrpl.js, use Fulfillment field
      finish.Fulfillment = fulfillment;
    }

    return finish;
  }

  /**
   * Cancel an escrow (after CancelAfter time)
   * Used for refunds when work is not delivered
   */
  async createEscrowCancel(
    cancellerAddress: string,
    escrowCreatorAddress: string,
    escrowSequence: number,
  ): Promise<EscrowCancel> {
    const cancel: EscrowCancel = {
      TransactionType: 'EscrowCancel',
      Account: cancellerAddress,
      Owner: escrowCreatorAddress,
      OfferSequence: escrowSequence,
    };

    return cancel;
  }

  /**
   * Submit an escrow transaction
   */
  async submitEscrowTransaction(transaction: EscrowCreate | EscrowFinish | EscrowCancel): Promise<any> {
    const xrplClient = getXRPLClient();
    const client = xrplClient.getClient();
    const wallet = xrplClient.getWallet();

    try {
      const prepared = await client.autofill(transaction);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      logger.info(`Escrow transaction submitted: ${result.result.hash}`);

      return {
        success: true,
        hash: result.result.hash,
        sequence: prepared.Sequence,
        result: result.result,
      };
    } catch (error) {
      logger.error('Escrow transaction failed:', error);
      throw error;
    }
  }

  /**
   * Get escrow details by owner and sequence
   */
  async getEscrow(ownerAddress: string, sequence: number): Promise<any> {
    const client = getXRPLClient().getClient();

    try {
      const response = await client.request({
        command: 'account_objects',
        account: ownerAddress,
        type: 'escrow',
      });

      const escrows = response.result.account_objects;
      const escrow = escrows.find((e: any) => e.PreviousTxnLgrSeq === sequence);

      return escrow;
    } catch (error) {
      logger.error(`Failed to get escrow for ${ownerAddress}, sequence ${sequence}:`, error);
      throw error;
    }
  }

  /**
   * Validate that fulfillment matches condition
   */
  validateFulfillment(condition: string, fulfillment: string): boolean {
    try {
      const fulfillmentBuffer = Buffer.from(fulfillment, 'hex');
      const calculatedCondition = createHash('sha256')
        .update(fulfillmentBuffer)
        .digest('hex')
        .toUpperCase();

      return calculatedCondition === condition.toUpperCase();
    } catch (error) {
      logger.error('Fulfillment validation failed:', error);
      return false;
    }
  }

  /**
   * Calculate escrow expiration buffer (7 days after delivery)
   */
  calculateFinishAfter(deliveryDate: Date): Date {
    return new Date(deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Calculate escrow cancellation time (30 days after delivery)
   */
  calculateCancelAfter(deliveryDate: Date): Date {
    return new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}

export const escrowService = new EscrowService();
