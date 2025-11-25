import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, schemas } from '../middleware/validate';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  email: schemas.email.optional(),
  phone_number: schemas.phoneNumber.optional(),
  role: schemas.role.optional(),
  profile_data: z.object({
    name: z.string().optional(),
    bio: z.string().max(500).optional(),
    skills: z.array(z.string()).optional(),
    location: z.string().optional(),
    avatar_url: z.string().url().optional(),
  }).optional(),
});

const walletParamSchema = z.object({
  wallet_address: schemas.walletAddress,
});

/**
 * GET /users/:wallet_address
 * Get public user profile
 */
router.get('/:wallet_address', validateParams(walletParamSchema), async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;
    const user = await UserModel.findByWalletAddress(wallet_address);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stats = await UserModel.getStats(wallet_address);

    res.json({
      user: {
        wallet_address: user.wallet_address,
        role: user.role,
        profile_data: user.profile_data,
        reputation_score: user.reputation_score,
        is_verified: user.is_verified,
        created_at: user.created_at,
      },
      stats: stats || {
        total_gigs: 0,
        completed_gigs: 0,
        average_rating: 0,
        total_reviews: 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

/**
 * PUT /users/profile
 * Update own profile (authenticated)
 */
router.put('/profile', authenticate, validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { email, phone_number, role, profile_data } = req.body;

    const updatedUser = await UserModel.update(req.user.id, {
      email,
      phone_number,
      role,
      profile_data,
    });

    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: updatedUser.id,
        wallet_address: updatedUser.wallet_address,
        email: updatedUser.email,
        phone_number: updatedUser.phone_number,
        role: updatedUser.role,
        profile_data: updatedUser.profile_data,
        reputation_score: updatedUser.reputation_score,
        is_verified: updatedUser.is_verified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

/**
 * GET /users
 * List users with filters (optional auth for personalization)
 */
router.get('/', validateQuery(schemas.pagination.extend({
  role: z.enum(['freelancer', 'client', 'both']).optional(),
  is_verified: z.coerce.boolean().optional(),
})), async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0, role, is_verified } = req.query as any;

    const users = await UserModel.list({
      role,
      isVerified: is_verified,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Return public profile data only
    const publicUsers = users.map((user) => ({
      wallet_address: user.wallet_address,
      role: user.role,
      profile_data: user.profile_data,
      reputation_score: user.reputation_score,
      is_verified: user.is_verified,
      created_at: user.created_at,
    }));

    res.json({
      users: publicUsers,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: publicUsers.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

/**
 * DELETE /users/account
 * Delete own account (authenticated)
 */
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await UserModel.delete(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete account' });
  }
});

export default router;
