import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TransactionModel } from '../models/Transaction';
import { GigModel } from '../models/Gig';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validate';
import { paymentService } from '../xrpl/payment';

const router = Router();

// Validation schemas
const initiatePaymentSchema = z.object({
  gig_id: schemas.uuid,
  amount_xrp: z.number().min(0.000001),
  currency: z.enum(['XRP', 'RLUSD']).default('XRP'),
});

const confirmPaymentSchema = z.object({
  xrpl_tx_hash: z.string().min(64).max(64),
  from_wallet: schemas.walletAddress,
  to_wallet: schemas.walletAddress,
  amount_xrp: z.number().min(0.000001),
});

const txIdParamSchema = z.object({
  id: schemas.uuid,
});

/**
 * POST /payments/initiate
 * Create a payment intent for a gig (returns payment details for Xaman)
 */
router.post('/initiate', authenticate, validateBody(initiatePaymentSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { gig_id, amount_xrp, currency } = req.body;

    // Verify gig exists
    const gig = await GigModel.findById(gig_id);
    if (!gig) {
      res.status(404).json({ error: 'Gig not found' });
      return;
    }

    // Get freelancer wallet address
    const { UserModel } = await import('../models/User');
    const freelancer = await UserModel.findById(gig.freelancer_id);
    if (!freelancer) {
      res.status(404).json({ error: 'Freelancer not found' });
      return;
    }

    // Validate addresses
    if (!paymentService.isValidAddress(req.user.wallet_address)) {
      res.status(400).json({ error: 'Invalid sender wallet address' });
      return;
    }

    if (!paymentService.isValidAddress(freelancer.wallet_address)) {
      res.status(400).json({ error: 'Invalid recipient wallet address' });
      return;
    }

    // Create payment transaction template for Xaman
    const paymentTx = await paymentService.createXRPPayment({
      fromAddress: req.user.wallet_address,
      toAddress: freelancer.wallet_address,
      amount: amount_xrp,
      memo: `Payment for gig: ${gig.title}`,
    });

    res.json({
      payment_intent: {
        gig_id,
        from_address: req.user.wallet_address,
        to_address: freelancer.wallet_address,
        amount_xrp,
        currency,
        transaction: paymentTx,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initiate payment' });
  }
});

/**
 * POST /payments/confirm
 * Confirm payment transaction after it's been submitted to XRPL
 */
router.post('/confirm', authenticate, validateBody(confirmPaymentSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { xrpl_tx_hash, from_wallet, to_wallet, amount_xrp } = req.body;

    // Check if transaction already exists
    const existing = await TransactionModel.findByHash(xrpl_tx_hash);
    if (existing) {
      res.status(400).json({ error: 'Transaction already recorded' });
      return;
    }

    // Verify the transaction on XRPL
    try {
      const txDetails = await paymentService.getTransaction(xrpl_tx_hash);
      
      // Validate transaction details match
      if (txDetails.Account !== from_wallet || txDetails.Destination !== to_wallet) {
        res.status(400).json({ error: 'Transaction details do not match' });
        return;
      }

      // Create transaction record
      const transaction = await TransactionModel.create({
        xrpl_tx_hash,
        from_wallet,
        to_wallet,
        amount_xrp,
        tx_type: 'payment',
        status: 'confirmed',
      });

      res.json({ transaction });
    } catch (error) {
      // Transaction not found on ledger yet - create as pending
      const transaction = await TransactionModel.create({
        xrpl_tx_hash,
        from_wallet,
        to_wallet,
        amount_xrp,
        tx_type: 'payment',
        status: 'pending',
      });

      res.json({ 
        transaction,
        message: 'Transaction pending confirmation on XRPL',
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to confirm payment' });
  }
});

/**
 * GET /payments/:id
 * Get payment details
 */
router.get('/:id', authenticate, validateParams(txIdParamSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const transaction = await TransactionModel.findById(id);

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    // Verify user is involved in this transaction
    if (transaction.from_wallet !== req.user.wallet_address && 
        transaction.to_wallet !== req.user.wallet_address) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ transaction });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transaction' });
  }
});

/**
 * GET /payments
 * List payments for authenticated user
 */
router.get('/', authenticate, validateQuery(schemas.pagination.extend({
  tx_type: z.enum(['payment', 'escrow_create', 'escrow_finish', 'escrow_cancel']).optional(),
  status: z.enum(['pending', 'confirmed', 'failed']).optional(),
})), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { limit = 20, offset = 0, tx_type, status } = req.query as any;

    const transactions = await TransactionModel.findByWallet(req.user.wallet_address, {
      tx_type,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get stats
    const stats = await TransactionModel.getStats(req.user.wallet_address);

    res.json({
      transactions,
      stats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: transactions.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

export default router;
