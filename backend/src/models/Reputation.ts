import { query } from '../db';
import { BadgeTier } from '../xrpl/reptoken';

export interface RepTokenBalance {
  id: string;
  user_id: string;
  available_balance: number;
  staked_balance: number;
  total_earned: number;
  last_updated: Date;
}

export interface StakingPosition {
  id: string;
  user_id: string;
  amount: number;
  tier: BadgeTier;
  staked_at: Date;
  unlock_at: Date;
  unstaked_at?: Date;
  status: 'active' | 'unstaked' | 'expired';
  created_at: Date;
}

export interface ReputationEvent {
  id: string;
  user_id: string;
  event_type: string;
  amount?: number;
  gig_id?: string;
  review_id?: string;
  description?: string;
  metadata: any;
  created_at: Date;
}

export interface UserBadge {
  id: string;
  user_id: string;
  tier: BadgeTier;
  staking_position_id?: string;
  earned_at: Date;
  active: boolean;
  metadata: any;
}

export interface ReputationScore {
  user_id: string;
  wallet_address: string;
  available_rep: number;
  staked_rep: number;
  total_rep_earned: number;
  gigs_completed: number;
  average_rating: number;
  reviews_received: number;
  active_badges: number;
  highest_badge?: BadgeTier;
  reputation_score: number;
}

export class ReputationModel {
  /**
   * Get or create RepToken balance for user
   */
  static async getBalance(userId: string): Promise<RepTokenBalance> {
    const result = await query<RepTokenBalance>(
      'SELECT * FROM reptoken_balances WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create if doesn't exist
      const createResult = await query<RepTokenBalance>(
        `INSERT INTO reptoken_balances (user_id) VALUES ($1) RETURNING *`,
        [userId]
      );
      return createResult.rows[0];
    }
    
    return result.rows[0];
  }

  /**
   * Update RepToken balance
   */
  static async updateBalance(
    userId: string,
    updates: {
      available_balance?: number;
      staked_balance?: number;
      total_earned?: number;
    }
  ): Promise<RepTokenBalance> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.available_balance !== undefined) {
      updateFields.push(`available_balance = $${paramCount++}`);
      values.push(updates.available_balance);
    }
    if (updates.staked_balance !== undefined) {
      updateFields.push(`staked_balance = $${paramCount++}`);
      values.push(updates.staked_balance);
    }
    if (updates.total_earned !== undefined) {
      updateFields.push(`total_earned = $${paramCount++}`);
      values.push(updates.total_earned);
    }

    updateFields.push(`last_updated = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await query<RepTokenBalance>(
      `UPDATE reptoken_balances SET ${updateFields.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Create staking position
   */
  static async createStakingPosition(data: {
    user_id: string;
    amount: number;
    tier: BadgeTier;
    unlock_at: Date;
  }): Promise<StakingPosition> {
    const result = await query<StakingPosition>(
      `INSERT INTO staking_positions (user_id, amount, tier, unlock_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.user_id, data.amount, data.tier, data.unlock_at]
    );

    return result.rows[0];
  }

  /**
   * Get active staking positions for user
   */
  static async getActiveStakingPositions(userId: string): Promise<StakingPosition[]> {
    const result = await query<StakingPosition>(
      `SELECT * FROM staking_positions 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY staked_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Unstake position
   */
  static async unstakePosition(positionId: string, userId: string): Promise<StakingPosition | null> {
    const result = await query<StakingPosition>(
      `UPDATE staking_positions 
       SET status = 'unstaked', unstaked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING *`,
      [positionId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Log reputation event
   */
  static async logEvent(data: {
    user_id: string;
    event_type: string;
    amount?: number;
    gig_id?: string;
    review_id?: string;
    description?: string;
    metadata?: any;
  }): Promise<ReputationEvent> {
    const result = await query<ReputationEvent>(
      `INSERT INTO reputation_events (user_id, event_type, amount, gig_id, review_id, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.user_id,
        data.event_type,
        data.amount || null,
        data.gig_id || null,
        data.review_id || null,
        data.description || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  /**
   * Get reputation events for user
   */
  static async getUserEvents(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ReputationEvent[]> {
    const result = await query<ReputationEvent>(
      `SELECT * FROM reputation_events 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Award badge to user
   */
  static async awardBadge(data: {
    user_id: string;
    tier: BadgeTier;
    staking_position_id?: string;
    metadata?: any;
  }): Promise<UserBadge> {
    const result = await query<UserBadge>(
      `INSERT INTO user_badges (user_id, tier, staking_position_id, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.user_id,
        data.tier,
        data.staking_position_id || null,
        JSON.stringify(data.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  /**
   * Get user badges
   */
  static async getUserBadges(userId: string): Promise<UserBadge[]> {
    const result = await query<UserBadge>(
      `SELECT * FROM user_badges 
       WHERE user_id = $1 AND active = TRUE
       ORDER BY earned_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Deactivate badge
   */
  static async deactivateBadge(badgeId: string, userId: string): Promise<boolean> {
    const result = await query(
      `UPDATE user_badges 
       SET active = FALSE
       WHERE id = $1 AND user_id = $2`,
      [badgeId, userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get reputation score for user
   */
  static async getReputationScore(userId: string): Promise<ReputationScore | null> {
    const result = await query<ReputationScore>(
      'SELECT * FROM reputation_scores WHERE user_id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit: number = 100): Promise<ReputationScore[]> {
    const result = await query<ReputationScore>(
      'SELECT * FROM reputation_leaderboard LIMIT $1',
      [limit]
    );

    return result.rows;
  }

  /**
   * Get user rank
   */
  static async getUserRank(userId: string): Promise<number | null> {
    const result = await query<{ rank: number }>(
      'SELECT rank FROM reputation_leaderboard WHERE user_id = $1',
      [userId]
    );

    return result.rows[0]?.rank || null;
  }
}
