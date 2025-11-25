import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth';
import { validateBody, schemas } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// Validation schemas
const getChallengeSchema = z.object({
  wallet_address: schemas.walletAddress,
});

const connectWalletSchema = z.object({
  wallet_address: schemas.walletAddress,
  signature: z.string().min(64),
  message: z.string(),
  role: schemas.role.optional(),
  email: schemas.email.optional(),
  phone_number: schemas.phoneNumber.optional(),
});

const refreshTokenSchema = z.object({
  token: z.string(),
});

/**
 * GET /auth/challenge
 * Get a challenge message for wallet signing
 */
router.get('/challenge', validateBody(getChallengeSchema), async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.body;
    const challenge = AuthService.generateChallenge(wallet_address);
    
    res.json({ message: challenge });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate challenge' });
  }
});

/**
 * POST /auth/connect-wallet
 * Authenticate or register user with wallet signature
 */
router.post('/connect-wallet', validateBody(connectWalletSchema), async (req: Request, res: Response) => {
  try {
    const { wallet_address, signature, message, role, email, phone_number } = req.body;

    // Verify challenge timestamp
    const isTimestampValid = AuthService.verifyChallengeTimestamp(message);
    if (!isTimestampValid) {
      res.status(400).json({ error: 'Challenge expired. Please request a new one.' });
      return;
    }

    // Authenticate
    const result = await AuthService.authenticateWithWallet({
      wallet_address,
      signature,
      message,
      role,
      email,
      phone_number,
    });

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

/**
 * POST /auth/logout
 * Logout user (delete session)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.substring(7) || '';
    await AuthService.deleteSession(token);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
});

/**
 * POST /auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', validateBody(refreshTokenSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const newToken = await AuthService.refreshToken(token);
    
    res.json({ token: newToken });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Token refresh failed' });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { UserModel } = await import('../models/User');
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get user stats
    const stats = await UserModel.getStats(user.wallet_address);

    res.json({
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        phone_number: user.phone_number,
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

export default router;
