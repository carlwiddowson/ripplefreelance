/**
 * Staking Service
 * 
 * Handles RepToken staking for badge eligibility
 * Users stake tokens for a lock period to earn verification badges
 */

import { ReputationModel } from '../models/Reputation';
import { repTokenService, BadgeTier, REPTOKEN_ECONOMICS } from '../xrpl/reptoken';
import { logger } from '../utils/logger';

export interface StakeParams {
  userId: string;
  amount: number;
  tier: BadgeTier;
}

export interface UnstakeParams {
  userId: string;
  positionId: string;
}

export class StakingService {
  /**
   * Stake RepTokens for a badge
   */
  async stake(params: StakeParams): Promise<any> {
    const { userId, amount, tier } = params;

    try {
      // Validate tier
      if (tier === BadgeTier.NONE) {
        throw new Error('Cannot stake for NONE tier');
      }

      // Check if user has enough tokens
      const balance = await ReputationModel.getBalance(userId);
      if (balance.available_balance < amount) {
        throw new Error(`Insufficient balance. Available: ${balance.available_balance}, Required: ${amount}`);
      }

      // Check if amount meets tier requirement
      const requiredAmount = repTokenService.getRequiredTokensForTier(tier);
      if (amount < requiredAmount) {
        throw new Error(`Insufficient amount for ${tier} tier. Required: ${requiredAmount}, Provided: ${amount}`);
      }

      // Calculate unlock date
      const unlockDate = repTokenService.calculateUnlockDate(tier);

      // Create staking position in database
      const stakingPosition = await ReputationModel.createStakingPosition({
        user_id: userId,
        amount,
        tier,
        unlock_at: unlockDate,
      });

      // Update user's balance (move from available to staked)
      await ReputationModel.updateBalance(userId, {
        available_balance: balance.available_balance - amount,
        staked_balance: balance.staked_balance + amount,
      });

      // Award badge
      const badge = await ReputationModel.awardBadge({
        user_id: userId,
        tier,
        staking_position_id: stakingPosition.id,
        metadata: {
          staked_amount: amount,
          unlock_date: unlockDate,
        },
      });

      // Log event
      await ReputationModel.logEvent({
        user_id: userId,
        event_type: 'stake',
        amount: -amount, // Negative to show tokens locked
        description: `Staked ${amount} REP for ${tier} badge`,
        metadata: {
          tier,
          staking_position_id: stakingPosition.id,
          badge_id: badge.id,
          unlock_at: unlockDate,
        },
      });

      logger.info(`User ${userId} staked ${amount} REP for ${tier} badge`);

      return {
        success: true,
        staking_position: stakingPosition,
        badge,
        unlock_at: unlockDate,
      };
    } catch (error) {
      logger.error(`Staking failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unstake RepTokens (after lock period)
   */
  async unstake(params: UnstakeParams): Promise<any> {
    const { userId, positionId } = params;

    try {
      // Get staking position
      const positions = await ReputationModel.getActiveStakingPositions(userId);
      const position = positions.find(p => p.id === positionId);

      if (!position) {
        throw new Error('Staking position not found or already unstaked');
      }

      // Check if lock period has expired
      const now = new Date();
      if (now < position.unlock_at) {
        const daysRemaining = Math.ceil((position.unlock_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        throw new Error(`Position still locked. ${daysRemaining} days remaining until ${position.unlock_at.toISOString()}`);
      }

      // Unstake position
      const unstakedPosition = await ReputationModel.unstakePosition(positionId, userId);
      if (!unstakedPosition) {
        throw new Error('Failed to unstake position');
      }

      // Update user's balance (move from staked to available)
      const balance = await ReputationModel.getBalance(userId);
      await ReputationModel.updateBalance(userId, {
        available_balance: balance.available_balance + position.amount,
        staked_balance: balance.staked_balance - position.amount,
      });

      // Deactivate associated badge
      const badges = await ReputationModel.getUserBadges(userId);
      const relatedBadge = badges.find(b => b.staking_position_id === positionId);
      if (relatedBadge) {
        await ReputationModel.deactivateBadge(relatedBadge.id, userId);
      }

      // Log event
      await ReputationModel.logEvent({
        user_id: userId,
        event_type: 'unstake',
        amount: position.amount,
        description: `Unstaked ${position.amount} REP from ${position.tier} badge`,
        metadata: {
          tier: position.tier,
          staking_position_id: positionId,
          staked_duration_days: Math.floor((now.getTime() - position.staked_at.getTime()) / (1000 * 60 * 60 * 24)),
        },
      });

      logger.info(`User ${userId} unstaked ${position.amount} REP from position ${positionId}`);

      return {
        success: true,
        amount: position.amount,
        tier: position.tier,
        unstaked_at: now,
      };
    } catch (error) {
      logger.error(`Unstaking failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get staking summary for user
   */
  async getStakingSummary(userId: string): Promise<any> {
    try {
      const balance = await ReputationModel.getBalance(userId);
      const positions = await ReputationModel.getActiveStakingPositions(userId);
      const badges = await ReputationModel.getUserBadges(userId);

      // Calculate next available tier
      let nextTier: BadgeTier | null = null;
      const hasBronze = badges.some(b => b.tier === BadgeTier.BRONZE);
      const hasSilver = badges.some(b => b.tier === BadgeTier.SILVER);
      const hasGold = badges.some(b => b.tier === BadgeTier.GOLD);

      if (!hasBronze) {
        nextTier = BadgeTier.BRONZE;
      } else if (!hasSilver) {
        nextTier = BadgeTier.SILVER;
      } else if (!hasGold) {
        nextTier = BadgeTier.GOLD;
      }

      const nextTierRequired = nextTier ? repTokenService.getRequiredTokensForTier(nextTier) : null;
      const canStakeForNextTier = nextTier && balance.available_balance >= (nextTierRequired || 0);

      return {
        balance: {
          available: balance.available_balance,
          staked: balance.staked_balance,
          total: balance.available_balance + balance.staked_balance,
          total_earned: balance.total_earned,
        },
        active_positions: positions.map(p => ({
          id: p.id,
          amount: p.amount,
          tier: p.tier,
          staked_at: p.staked_at,
          unlock_at: p.unlock_at,
          days_remaining: Math.max(0, Math.ceil((p.unlock_at.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
          is_unlocked: new Date() >= p.unlock_at,
        })),
        badges: badges.map(b => ({
          tier: b.tier,
          earned_at: b.earned_at,
          active: b.active,
        })),
        next_tier: nextTier ? {
          tier: nextTier,
          required_tokens: nextTierRequired,
          tokens_needed: Math.max(0, (nextTierRequired || 0) - balance.available_balance),
          can_stake: canStakeForNextTier,
          lock_period_days: repTokenService.getLockPeriodForTier(nextTier),
        } : null,
      };
    } catch (error) {
      logger.error(`Failed to get staking summary for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user can stake for a specific tier
   */
  async canStake(userId: string, tier: BadgeTier): Promise<boolean> {
    try {
      const balance = await ReputationModel.getBalance(userId);
      const badges = await ReputationModel.getUserBadges(userId);

      // Check if already has this badge
      const hasBadge = badges.some(b => b.tier === tier && b.active);
      if (hasBadge) {
        return false;
      }

      // Check if has enough tokens
      const requiredAmount = repTokenService.getRequiredTokensForTier(tier);
      return balance.available_balance >= requiredAmount;
    } catch (error) {
      logger.error(`Failed to check staking eligibility for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get staking tiers info
   */
  getStakingTiers(): any {
    return {
      tiers: [
        {
          tier: BadgeTier.BRONZE,
          required_tokens: REPTOKEN_ECONOMICS.STAKING_TIERS.BRONZE,
          lock_period_days: REPTOKEN_ECONOMICS.LOCK_PERIODS.BRONZE,
          benefits: [
            'Bronze verification badge',
            'Increased profile visibility',
            '1.5x reputation score multiplier',
          ],
        },
        {
          tier: BadgeTier.SILVER,
          required_tokens: REPTOKEN_ECONOMICS.STAKING_TIERS.SILVER,
          lock_period_days: REPTOKEN_ECONOMICS.LOCK_PERIODS.SILVER,
          benefits: [
            'Silver verification badge',
            'Priority in search results',
            '1.5x reputation score multiplier',
            'Featured freelancer status',
          ],
        },
        {
          tier: BadgeTier.GOLD,
          required_tokens: REPTOKEN_ECONOMICS.STAKING_TIERS.GOLD,
          lock_period_days: REPTOKEN_ECONOMICS.LOCK_PERIODS.GOLD,
          benefits: [
            'Gold verification badge',
            'Top priority in all listings',
            '1.5x reputation score multiplier',
            'Featured + verified status',
            'Access to premium gigs',
          ],
        },
      ],
    };
  }
}

export const stakingService = new StakingService();
