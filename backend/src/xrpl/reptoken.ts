/**
 * RepToken Service
 * 
 * Manages the issuance, distribution, and tracking of Reputation Tokens (REP)
 * RepToken is the platform's reward token for quality work, reviews, and participation
 */

import { Payment, TrustSet } from 'xrpl';
import { getXRPLClient } from './client';
import { logger } from '../utils/logger';
import { Currency, getCurrencyConfig } from './config';

/**
 * RepToken Economics
 */
export const REPTOKEN_ECONOMICS = {
  // Earning mechanisms
  REWARDS: {
    GIG_COMPLETION: 100,      // Tokens for completing a gig
    PERFECT_RATING: 50,        // Bonus for 5-star review
    FIRST_GIG: 200,            // Bonus for first completed gig
    MILESTONE_COMPLETION: 25,  // Per milestone completed
    REVIEW_RECEIVED: 10,       // For each review received (any rating)
    REVIEW_GIVEN: 5,           // For giving a review
  },
  
  // Staking tiers for badges
  STAKING_TIERS: {
    BRONZE: 500,    // 500 REP tokens
    SILVER: 2000,   // 2,000 REP tokens
    GOLD: 10000,    // 10,000 REP tokens
  },
  
  // Lock periods (in days)
  LOCK_PERIODS: {
    BRONZE: 30,
    SILVER: 90,
    GOLD: 180,
  },
  
  // Reputation score weights
  SCORE_WEIGHTS: {
    GIG_COMPLETION: 1.0,
    AVERAGE_RATING: 2.0,
    TOKEN_BALANCE: 0.5,
    BADGE_MULTIPLIER: 1.5,  // Multiplies total score
  },
};

export enum BadgeTier {
  NONE = 'NONE',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export interface RepTokenBalance {
  available: number;       // Tokens available for use/staking
  staked: number;          // Tokens locked in staking
  total: number;           // Total owned
  earned_lifetime: number; // Total ever earned
}

export interface StakingPosition {
  amount: number;
  tier: BadgeTier;
  staked_at: Date;
  unlock_at: Date;
  is_locked: boolean;
}

export class RepTokenService {
  /**
   * Issue RepTokens to a user
   * This is called by the platform after verifiable events (gig completion, reviews, etc.)
   */
  async issueTokens(
    recipientAddress: string,
    amount: number,
    reason: string,
  ): Promise<any> {
    try {
      const xrplClient = getXRPLClient();
      const client = xrplClient.getClient();
      const issuerWallet = xrplClient.getWallet(); // Platform's RepToken issuer account

      const config = getCurrencyConfig(Currency.REPTOKEN);

      // Create payment transaction to issue tokens
      const payment: Payment = {
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Destination: recipientAddress,
        Amount: {
          currency: config.code,
          value: amount.toString(),
          issuer: config.issuer!,
        },
        Memos: [
          {
            Memo: {
              MemoData: Buffer.from(reason, 'utf8').toString('hex').toUpperCase(),
              MemoType: Buffer.from('reptoken_issuance', 'utf8').toString('hex').toUpperCase(),
            },
          },
        ],
      };

      const prepared = await client.autofill(payment);
      const signed = issuerWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      logger.info(`Issued ${amount} REP to ${recipientAddress}: ${reason}`);

      return {
        success: true,
        hash: result.result.hash,
        amount,
        reason,
      };
    } catch (error) {
      logger.error(`Failed to issue RepTokens to ${recipientAddress}:`, error);
      throw error;
    }
  }

  /**
   * Reward user for completing a gig
   */
  async rewardGigCompletion(
    userAddress: string,
    gigId: string,
    rating?: number,
    isFirstGig: boolean = false,
  ): Promise<number> {
    let totalReward = REPTOKEN_ECONOMICS.REWARDS.GIG_COMPLETION;

    // Bonus for perfect rating
    if (rating === 5) {
      totalReward += REPTOKEN_ECONOMICS.REWARDS.PERFECT_RATING;
    }

    // Bonus for first gig
    if (isFirstGig) {
      totalReward += REPTOKEN_ECONOMICS.REWARDS.FIRST_GIG;
    }

    await this.issueTokens(
      userAddress,
      totalReward,
      `Gig completion reward: ${gigId}${rating ? ` (${rating}★)` : ''}`,
    );

    return totalReward;
  }

  /**
   * Reward user for receiving a review
   */
  async rewardReviewReceived(userAddress: string, reviewId: string): Promise<number> {
    const reward = REPTOKEN_ECONOMICS.REWARDS.REVIEW_RECEIVED;
    
    await this.issueTokens(
      userAddress,
      reward,
      `Review received: ${reviewId}`,
    );

    return reward;
  }

  /**
   * Reward user for giving a review
   */
  async rewardReviewGiven(userAddress: string, reviewId: string): Promise<number> {
    const reward = REPTOKEN_ECONOMICS.REWARDS.REVIEW_GIVEN;
    
    await this.issueTokens(
      userAddress,
      reward,
      `Review given: ${reviewId}`,
    );

    return reward;
  }

  /**
   * Get RepToken balance for a user
   */
  async getBalance(userAddress: string): Promise<number> {
    try {
      const client = getXRPLClient().getClient();
      const config = getCurrencyConfig(Currency.REPTOKEN);

      const response = await client.request({
        command: 'account_lines',
        account: userAddress,
        ledger_index: 'validated',
      });

      const repTokenLine = response.result.lines.find(
        (line: any) => line.currency === config.code && line.account === config.issuer
      );

      return repTokenLine ? parseFloat(repTokenLine.balance) : 0;
    } catch (error) {
      logger.error(`Failed to get RepToken balance for ${userAddress}:`, error);
      return 0;
    }
  }

  /**
   * Check if user has RepToken trustline
   */
  async hasTrustline(userAddress: string): Promise<boolean> {
    try {
      const client = getXRPLClient().getClient();
      const config = getCurrencyConfig(Currency.REPTOKEN);

      const response = await client.request({
        command: 'account_lines',
        account: userAddress,
        ledger_index: 'validated',
      });

      return response.result.lines.some(
        (line: any) => line.currency === config.code && line.account === config.issuer
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate trustline transaction for RepToken
   */
  async generateTrustlineTransaction(userAddress: string, limit: string = '1000000'): Promise<TrustSet> {
    const client = getXRPLClient().getClient();
    const config = getCurrencyConfig(Currency.REPTOKEN);

    const trustSet: TrustSet = {
      TransactionType: 'TrustSet',
      Account: userAddress,
      LimitAmount: {
        currency: config.code,
        issuer: config.issuer!,
        value: limit,
      },
    };

    const prepared = await client.autofill(trustSet);
    return prepared;
  }

  /**
   * Calculate badge tier based on staked amount
   */
  getBadgeTier(stakedAmount: number): BadgeTier {
    if (stakedAmount >= REPTOKEN_ECONOMICS.STAKING_TIERS.GOLD) {
      return BadgeTier.GOLD;
    } else if (stakedAmount >= REPTOKEN_ECONOMICS.STAKING_TIERS.SILVER) {
      return BadgeTier.SILVER;
    } else if (stakedAmount >= REPTOKEN_ECONOMICS.STAKING_TIERS.BRONZE) {
      return BadgeTier.BRONZE;
    }
    return BadgeTier.NONE;
  }

  /**
   * Calculate lock period end date
   */
  calculateUnlockDate(tier: BadgeTier): Date {
    const days = REPTOKEN_ECONOMICS.LOCK_PERIODS[tier];
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + days);
    return unlockDate;
  }

  /**
   * Check if user can stake for a specific tier
   */
  canStakeForTier(balance: number, tier: BadgeTier): boolean {
    const required = REPTOKEN_ECONOMICS.STAKING_TIERS[tier];
    return balance >= required;
  }

  /**
   * Calculate reputation score
   * This is a composite score based on multiple factors
   */
  calculateReputationScore(params: {
    gigsCompleted: number;
    averageRating: number;
    tokenBalance: number;
    badgeTier: BadgeTier;
  }): number {
    const weights = REPTOKEN_ECONOMICS.SCORE_WEIGHTS;

    // Base score from gigs and ratings
    const gigScore = params.gigsCompleted * weights.GIG_COMPLETION;
    const ratingScore = (params.averageRating / 5) * 100 * weights.AVERAGE_RATING;
    const tokenScore = (params.tokenBalance / 1000) * weights.TOKEN_BALANCE;

    let totalScore = gigScore + ratingScore + tokenScore;

    // Apply badge multiplier
    if (params.badgeTier !== BadgeTier.NONE) {
      totalScore *= weights.BADGE_MULTIPLIER;
    }

    // Normalize to 0-100 scale
    return Math.min(100, Math.round(totalScore));
  }

  /**
   * Get required token amount for badge tier
   */
  getRequiredTokensForTier(tier: BadgeTier): number {
    return REPTOKEN_ECONOMICS.STAKING_TIERS[tier] || 0;
  }

  /**
   * Get lock period for badge tier (in days)
   */
  getLockPeriodForTier(tier: BadgeTier): number {
    return REPTOKEN_ECONOMICS.LOCK_PERIODS[tier] || 0;
  }
}

export const repTokenService = new RepTokenService();
