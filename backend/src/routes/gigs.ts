import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GigModel } from '../models/Gig';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validate';

const router = Router();

// Validation schemas
const createGigSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20).max(5000),
  category: z.string().min(2).max(100),
  skills: z.array(z.string()).optional(),
  price_usd: z.number().min(0.01).max(1000000),
  estimated_delivery_days: z.number().int().min(1).max(365),
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    percentage: z.number().min(0).max(100),
  })).optional(),
});

const updateGigSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  description: z.string().min(20).max(5000).optional(),
  category: z.string().min(2).max(100).optional(),
  skills: z.array(z.string()).optional(),
  price_usd: z.number().min(0.01).max(1000000).optional(),
  estimated_delivery_days: z.number().int().min(1).max(365).optional(),
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    percentage: z.number().min(0).max(100),
  })).optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
});

const gigIdParamSchema = z.object({
  id: schemas.uuid,
});

const listGigsQuerySchema = schemas.pagination.extend({
  freelancer_id: schemas.uuid.optional(),
  category: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
});

/**
 * POST /gigs
 * Create a new gig (authenticated freelancers only)
 */
router.post('/', authenticate, validateBody(createGigSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user is a freelancer
    if (req.user.role !== 'freelancer' && req.user.role !== 'both') {
      res.status(403).json({ error: 'Only freelancers can create gigs' });
      return;
    }

    const { title, description, category, skills, price_usd, estimated_delivery_days, milestones } = req.body;

    const gig = await GigModel.create({
      freelancer_id: req.user.id,
      title,
      description,
      category,
      skills,
      price_usd,
      estimated_delivery_days,
      milestones,
    });

    res.status(201).json({ gig });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create gig' });
  }
});

/**
 * GET /gigs
 * List all gigs with optional filters
 */
router.get('/', validateQuery(listGigsQuerySchema), async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0, freelancer_id, category, status, min_price, max_price } = req.query as any;

    const gigs = await GigModel.list({
      freelancer_id,
      category,
      status,
      min_price: min_price ? parseFloat(min_price) : undefined,
      max_price: max_price ? parseFloat(max_price) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      gigs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: gigs.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch gigs' });
  }
});

/**
 * GET /gigs/:id
 * Get a single gig by ID
 */
router.get('/:id', validateParams(gigIdParamSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const gig = await GigModel.findById(id);

    if (!gig) {
      res.status(404).json({ error: 'Gig not found' });
      return;
    }

    res.json({ gig });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch gig' });
  }
});

/**
 * PUT /gigs/:id
 * Update a gig (authenticated, owner only)
 */
router.put('/:id', authenticate, validateParams(gigIdParamSchema), validateBody(updateGigSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const gig = await GigModel.findById(id);

    if (!gig) {
      res.status(404).json({ error: 'Gig not found' });
      return;
    }

    // Check ownership
    if (gig.freelancer_id !== req.user.id) {
      res.status(403).json({ error: 'You can only update your own gigs' });
      return;
    }

    const { title, description, category, skills, price_usd, estimated_delivery_days, milestones, status } = req.body;

    const updatedGig = await GigModel.update(id, req.user.id, {
      title,
      description,
      category,
      skills,
      price_usd,
      estimated_delivery_days,
      milestones,
      status,
    });

    if (!updatedGig) {
      res.status(404).json({ error: 'Failed to update gig' });
      return;
    }

    res.json({ gig: updatedGig });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update gig' });
  }
});

/**
 * DELETE /gigs/:id
 * Delete a gig (authenticated, owner only, only if status is 'open')
 */
router.delete('/:id', authenticate, validateParams(gigIdParamSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const gig = await GigModel.findById(id);

    if (!gig) {
      res.status(404).json({ error: 'Gig not found' });
      return;
    }

    // Check ownership
    if (gig.freelancer_id !== req.user.id) {
      res.status(403).json({ error: 'You can only delete your own gigs' });
      return;
    }

    // Check if gig is open
    if (gig.status !== 'open') {
      res.status(400).json({ error: 'Only gigs with status "open" can be deleted' });
      return;
    }

    const deleted = await GigModel.delete(id, req.user.id);

    if (!deleted) {
      res.status(400).json({ error: 'Failed to delete gig' });
      return;
    }

    res.json({ message: 'Gig deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete gig' });
  }
});

export default router;
