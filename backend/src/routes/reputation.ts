import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { ReputationModel } from '../models/Reputation';
import { stakingService } from '../services/StakingService';
import { repTokenService, BadgeTier } from '../xrpl/reptoken';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/reputation/balance
 * Get RepToken balance for authenticated user
 */
router.get('/balance', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const balance = await ReputationModel.getBalance(userId);

    res.json({
      success: true,
      balance: {
        available: parseFloat(balance.available_balance.toString()),
        staked: parseFloat(balance.staked_balance.toString()),
        total: parseFloat(balance.available_balance.toString()) + parseFloat(balance.staked_balance.toString()),
        total_earned: parseFloat(balance.total_earned.toString()),
      },
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

/**
 * GET /api/v1/reputation/score
 * Get reputation score for authenticated user
 */
router.get('/score', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const score = await ReputationModel.getReputationScore(userId);

    if (!score) {
      return res.status(404).json({ error: 'Reputation score not found' });
    }

    res.json({
      success: true,
      score: {
        user_id: score.user_id,
        wallet_address: score.wallet_address,
        reputation_score: Math.round(parseFloat(score.reputation_score.toString())),
        gigs_completed: score.gigs_completed,
        average_rating: parseFloat(score.average_rating.toString()).toFixed(2),
        reviews_received: score.reviews_received,
        rep_tokens: {
          available: parseFloat(score.available_rep.toString()),
          staked: parseFloat(score.staked_rep.toString()),
          total_earned: parseFloat(score.total_rep_earned.toString()),
        },
        badges: {
          active_count: score.active_badges,
          highest_tier: score.highest_badge || 'NONE',
        },
      },
    });
  } catch (error) {
    logger.error('Get reputation score error:', error);
    res.status(500).json({ error: 'Failed to get reputation score' });
  }
});

/**
 * GET /api/v1/reputation/rank
 * Get user's rank on leaderboard
 */
router.get('/rank', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const rank = await ReputationModel.getUserRank(userId);

    res.json({
      success: true,
      rank: rank || null,
    });
  } catch (error) {
    logger.error('Get rank error:', error);
    res.status(500).json({ error: 'Failed to get rank' });
  }
});

/**
 * GET /api/v1/reputation/leaderboard
 * Get reputation leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await ReputationModel.getLeaderboard(Math.min(limit, 1000));

    res.json({
      success: true,
      leaderboard: leaderboard.map(entry => ({
        rank: entry.rank,
        wallet_address: entry.wallet_address,
        reputation_score: Math.round(parseFloat(entry.reputation_score.toString())),
        gigs_completed: entry.gigs_completed,
        average_rating: parseFloat(entry.average_rating.toString()).toFixed(2),
        total_rep_earned: parseFloat(entry.total_rep_earned.toString()),
        highest_badge: entry.highest_badge || 'NONE',
      })),
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * GET /api/v1/reputation/events
 * Get reputation events for authenticated user
 */
router.get('/events', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const events = await ReputationModel.getUserEvents(userId, limit, offset);

    res.json({
      success: true,
      events: events.map(e => ({
        id: e.id,
        event_type: e.event_type,
        amount: e.amount ? parseFloat(e.amount.toString()) : null,
        description: e.description,
        gig_id: e.gig_id,
        review_id: e.review_id,
        metadata: e.metadata,
        created_at: e.created_at,
      })),
    });
  } catch (error) {
    logger.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

/**
 * GET /api/v1/reputation/staking/summary
 * Get staking summary for authenticated user
 */
router.get('/staking/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const summary = await stakingService.getStakingSummary(userId);

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    logger.error('Get staking summary error:', error);
    res.status(500).json({ error: 'Failed to get staking summary' });
  }
});

/**
 * GET /api/v1/reputation/staking/tiers
 * Get staking tiers information
 */
router.get('/staking/tiers', async (req: Request, res: Response) => {
  try {
    const tiers = stakingService.getStakingTiers();
    res.json({
      success: true,
      ...tiers,
    });
  } catch (error) {
    logger.error('Get staking tiers error:', error);
    res.status(500).json({ error: 'Failed to get staking tiers' });
  }
});

/**
 * POST /api/v1/reputation/staking/stake
 * Stake RepTokens for a badge
 */
router.post('/staking/stake', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const walletAddress = (req as any).user.wallet_address;
    const { amount, tier } = req.body;

    if (!amount || !tier) {
      return res.status(400).json({ error: 'Amount and tier are required' });
    }

    if (!Object.values(BadgeTier).includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const result = await stakingService.stake({
      userId,
      walletAddress,
      amount: parseFloat(amount),
      tier,
    });

    res.json({
      success: true,
      staking_position: {
        id: result.staking_position.id,
        amount: parseFloat(result.staking_position.amount.toString()),
        tier: result.staking_position.tier,
        unlock_at: result.unlock_at,
      },
      badge: {
        tier: result.badge.tier,
        earned_at: result.badge.earned_at,
      },
    });
  } catch (error: any) {
    logger.error('Stake error:', error);
    res.status(400).json({ error: error.message || 'Failed to stake' });
  }
});

/**
 * POST /api/v1/reputation/staking/unstake
 * Unstake RepTokens after lock period
 */
router.post('/staking/unstake', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { position_id } = req.body;

    if (!position_id) {
      return res.status(400).json({ error: 'Position ID is required' });
    }

    const result = await stakingService.unstake({
      userId,
      positionId: position_id,
    });

    res.json({
      success: true,
      amount: parseFloat(result.amount.toString()),
      tier: result.tier,
      unstaked_at: result.unstaked_at,
    });
  } catch (error: any) {
    logger.error('Unstake error:', error);
    res.status(400).json({ error: error.message || 'Failed to unstake' });
  }
});

/**
 * GET /api/v1/reputation/badges
 * Get user's badges
 */
router.get('/badges', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const badges = await ReputationModel.getUserBadges(userId);

    res.json({
      success: true,
      badges: badges.map(b => ({
        id: b.id,
        tier: b.tier,
        earned_at: b.earned_at,
        active: b.active,
        metadata: b.metadata,
      })),
    });
  } catch (error) {
    logger.error('Get badges error:', error);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

export default router;
