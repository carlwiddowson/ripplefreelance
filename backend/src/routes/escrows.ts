import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EscrowModel } from '../models/Escrow';
import { TransactionModel } from '../models/Transaction';
import { GigModel } from '../models/Gig';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validate';
import { escrowService } from '../xrpl/escrow';
import { paymentService } from '../xrpl/payment';

const router = Router();

// Validation schemas
const createEscrowSchema = z.object({
  gig_id: schemas.uuid,
  amount_xrp: z.number().min(0.000001),
  delivery_date: z.string().datetime(),
});

const releaseEscrowSchema = z.object({
  xrpl_tx_hash: z.string().min(64).max(64),
});

const cancelEscrowSchema = z.object({
  xrpl_tx_hash: z.string().min(64).max(64),
});

const escrowIdParamSchema = z.object({
  id: schemas.uuid,
});

/**
 * POST /escrows/create
 * Create an escrow for a gig (returns escrow transaction for Xaman)
 */
router.post('/create', authenticate, validateBody(createEscrowSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { gig_id, amount_xrp, delivery_date } = req.body;

    // Verify gig exists
    const gig = await GigModel.findById(gig_id);
    if (!gig) {
      res.status(404).json({ error: 'Gig not found' });
      return;
    }

    // Check if escrow already exists for this gig
    const existingEscrow = await EscrowModel.findActiveByGigId(gig_id);
    if (existingEscrow) {
      res.status(400).json({ error: 'Active escrow already exists for this gig' });
      return;
    }

    // Get freelancer wallet
    const { UserModel } = await import('../models/User');
    const freelancer = await UserModel.findById(gig.freelancer_id);
    if (!freelancer) {
      res.status(404).json({ error: 'Freelancer not found' });
      return;
    }

    // Validate wallet addresses
    if (!paymentService.isValidAddress(req.user.wallet_address)) {
      res.status(400).json({ error: 'Invalid client wallet address' });
      return;
    }

    if (!paymentService.isValidAddress(freelancer.wallet_address)) {
      res.status(400).json({ error: 'Invalid freelancer wallet address' });
      return;
    }

    // Create escrow transaction with condition
    const deliveryDateObj = new Date(delivery_date);
    const { escrow: escrowTx, fulfillment } = await escrowService.createMilestoneEscrow(
      req.user.wallet_address,
      freelancer.wallet_address,
      amount_xrp,
      deliveryDateObj
    );

    // Return escrow transaction for Xaman signing
    // Note: We'll save the escrow to DB after the user signs and submits
    res.json({
      escrow_intent: {
        gig_id,
        client_wallet: req.user.wallet_address,
        freelancer_wallet: freelancer.wallet_address,
        amount_xrp,
        delivery_date: deliveryDateObj,
        transaction: escrowTx,
        // Store fulfillment temporarily for the next request
        // In production, use Redis or session storage
        condition: escrowTx.Condition,
        fulfillment, // Frontend will send this back on confirm
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create escrow' });
  }
});

/**
 * POST /escrows/confirm
 * Confirm escrow creation after transaction is submitted
 */
router.post('/confirm', authenticate, validateBody(z.object({
  gig_id: schemas.uuid,
  xrpl_tx_hash: z.string().min(64).max(64),
  xrpl_sequence_number: z.number().int().positive(),
  condition: z.string(),
  fulfillment: z.string(),
  finish_after: z.string().datetime().optional(),
  cancel_after: z.string().datetime(),
  amount_xrp: z.number().min(0.000001),
})), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { gig_id, xrpl_tx_hash, xrpl_sequence_number, condition, fulfillment, finish_after, cancel_after, amount_xrp } = req.body;

    // Verify gig
    const gig = await GigModel.findById(gig_id);
    if (!gig) {
      res.status(404).json({ error: 'Gig not found' });
      return;
    }

    // Get freelancer
    const { UserModel } = await import('../models/User');
    const freelancer = await UserModel.findById(gig.freelancer_id);
    if (!freelancer) {
      res.status(404).json({ error: 'Freelancer not found' });
      return;
    }

    // Validate fulfillment matches condition
    if (!escrowService.validateFulfillment(condition, fulfillment)) {
      res.status(400).json({ error: 'Invalid fulfillment for condition' });
      return;
    }

    // Create escrow record with encrypted fulfillment
    const escrow = await EscrowModel.create({
      xrpl_sequence_number,
      gig_id,
      client_wallet: req.user.wallet_address,
      freelancer_wallet: freelancer.wallet_address,
      amount_xrp,
      condition_hash: condition,
      fulfillment, // Will be encrypted by the model
      finish_after: finish_after ? new Date(finish_after) : undefined,
      cancel_after: new Date(cancel_after),
      status: 'created',
    });

    // Create transaction record
    await TransactionModel.create({
      xrpl_tx_hash,
      from_wallet: req.user.wallet_address,
      to_wallet: freelancer.wallet_address,
      amount_xrp,
      tx_type: 'escrow_create',
      gig_id,
      status: 'confirmed',
    });

    // Update gig status to in_progress
    await GigModel.updateStatus(gig_id, 'in_progress');

    res.json({ escrow });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to confirm escrow' });
  }
});

/**
 * POST /escrows/:id/release
 * Release an escrow (returns EscrowFinish transaction for Xaman)
 */
router.post('/:id/release', authenticate, validateParams(escrowIdParamSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const escrow = await EscrowModel.findById(id);

    if (!escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }

    // Verify user is the client (who created the escrow)
    if (escrow.client_wallet !== req.user.wallet_address) {
      res.status(403).json({ error: 'Only the client can release the escrow' });
      return;
    }

    if (escrow.status !== 'created') {
      res.status(400).json({ error: 'Escrow is not in created status' });
      return;
    }

    // Get decrypted fulfillment
    const fulfillment = await EscrowModel.getFulfillment(id);

    // Create EscrowFinish transaction
    const finishTx = await escrowService.createEscrowFinish(
      req.user.wallet_address,
      escrow.client_wallet,
      escrow.xrpl_sequence_number,
      fulfillment
    );

    res.json({
      release_intent: {
        escrow_id: id,
        transaction: finishTx,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to prepare escrow release' });
  }
});

/**
 * POST /escrows/:id/release/confirm
 * Confirm escrow release after transaction is submitted
 */
router.post('/:id/release/confirm', authenticate, validateParams(escrowIdParamSchema), validateBody(releaseEscrowSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { xrpl_tx_hash } = req.body;

    const escrow = await EscrowModel.findById(id);
    if (!escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }

    // Update escrow status
    await EscrowModel.markReleased(id, xrpl_tx_hash);

    // Create transaction record
    await TransactionModel.create({
      xrpl_tx_hash,
      from_wallet: escrow.client_wallet,
      to_wallet: escrow.freelancer_wallet,
      amount_xrp: escrow.amount_xrp,
      tx_type: 'escrow_finish',
      gig_id: escrow.gig_id,
      status: 'confirmed',
    });

    // Update gig status to completed
    await GigModel.updateStatus(escrow.gig_id, 'completed');

    res.json({ 
      message: 'Escrow released successfully',
      escrow: await EscrowModel.findById(id),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to confirm escrow release' });
  }
});

/**
 * POST /escrows/:id/cancel
 * Cancel an escrow (returns EscrowCancel transaction for Xaman)
 */
router.post('/:id/cancel', authenticate, validateParams(escrowIdParamSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const escrow = await EscrowModel.findById(id);

    if (!escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }

    // Either party can cancel after CancelAfter time
    if (escrow.client_wallet !== req.user.wallet_address && 
        escrow.freelancer_wallet !== req.user.wallet_address) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (escrow.status !== 'created') {
      res.status(400).json({ error: 'Escrow is not in created status' });
      return;
    }

    // Check if CancelAfter time has passed
    if (new Date() < escrow.cancel_after) {
      res.status(400).json({ 
        error: 'Cannot cancel escrow before cancel_after time',
        cancel_after: escrow.cancel_after,
      });
      return;
    }

    // Create EscrowCancel transaction
    const cancelTx = await escrowService.createEscrowCancel(
      req.user.wallet_address,
      escrow.client_wallet,
      escrow.xrpl_sequence_number
    );

    res.json({
      cancel_intent: {
        escrow_id: id,
        transaction: cancelTx,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to prepare escrow cancellation' });
  }
});

/**
 * POST /escrows/:id/cancel/confirm
 * Confirm escrow cancellation after transaction is submitted
 */
router.post('/:id/cancel/confirm', authenticate, validateParams(escrowIdParamSchema), validateBody(cancelEscrowSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { xrpl_tx_hash } = req.body;

    const escrow = await EscrowModel.findById(id);
    if (!escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }

    // Update escrow status
    await EscrowModel.markCancelled(id, xrpl_tx_hash);

    // Create transaction record
    await TransactionModel.create({
      xrpl_tx_hash,
      from_wallet: escrow.freelancer_wallet, // Funds go back to client
      to_wallet: escrow.client_wallet,
      amount_xrp: escrow.amount_xrp,
      tx_type: 'escrow_cancel',
      gig_id: escrow.gig_id,
      status: 'confirmed',
    });

    // Update gig status to cancelled
    await GigModel.updateStatus(escrow.gig_id, 'cancelled');

    res.json({ 
      message: 'Escrow cancelled successfully',
      escrow: await EscrowModel.findById(id),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to confirm escrow cancellation' });
  }
});

/**
 * GET /escrows/:id
 * Get escrow details
 */
router.get('/:id', authenticate, validateParams(escrowIdParamSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const escrow = await EscrowModel.findById(id);

    if (!escrow) {
      res.status(404).json({ error: 'Escrow not found' });
      return;
    }

    // Verify user is involved in this escrow
    if (escrow.client_wallet !== req.user.wallet_address && 
        escrow.freelancer_wallet !== req.user.wallet_address) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Don't expose fulfillment_hash
    const { fulfillment_hash, ...escrowData } = escrow;

    res.json({ escrow: escrowData });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch escrow' });
  }
});

/**
 * GET /escrows
 * List escrows for authenticated user
 */
router.get('/', authenticate, validateQuery(schemas.pagination.extend({
  status: z.enum(['created', 'released', 'cancelled', 'expired']).optional(),
})), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { limit = 20, offset = 0, status } = req.query as any;

    const escrows = await EscrowModel.findByWallet(req.user.wallet_address, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get stats
    const stats = await EscrowModel.getStats(req.user.wallet_address);

    // Remove fulfillment_hash from results
    const sanitizedEscrows = escrows.map(({ fulfillment_hash, ...rest }) => rest);

    res.json({
      escrows: sanitizedEscrows,
      stats,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: escrows.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch escrows' });
  }
});

export default router;
