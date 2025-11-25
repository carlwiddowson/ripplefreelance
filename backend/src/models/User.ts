import { query } from '../db';
import { User } from '../db';

export class UserModel {
  /**
   * Create a new user
   */
  static async create(data: {
    wallet_address: string;
    email?: string;
    phone_number?: string;
    role: 'freelancer' | 'client' | 'both';
    profile_data?: any;
  }): Promise<User> {
    const result = await query<User>(
      `INSERT INTO users (wallet_address, email, phone_number, role, profile_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.wallet_address,
        data.email || null,
        data.phone_number || null,
        data.role,
        JSON.stringify(data.profile_data || {}),
      ]
    );
    return result.rows[0];
  }

  /**
   * Find user by wallet address
   */
  static async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Update user profile
   */
  static async update(
    id: string,
    data: Partial<Pick<User, 'email' | 'phone_number' | 'role' | 'profile_data'>>
  ): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      values.push(data.phone_number);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(data.role);
    }
    if (data.profile_data !== undefined) {
      updates.push(`profile_data = $${paramCount++}`);
      values.push(JSON.stringify(data.profile_data));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update reputation score
   */
  static async updateReputationScore(id: string, score: number): Promise<void> {
    await query(
      'UPDATE users SET reputation_score = $1 WHERE id = $2',
      [score, id]
    );
  }

  /**
   * Verify user
   */
  static async verify(id: string): Promise<void> {
    await query(
      'UPDATE users SET is_verified = true WHERE id = $1',
      [id]
    );
  }

  /**
   * Get user stats
   */
  static async getStats(walletAddress: string): Promise<any> {
    const result = await query(
      'SELECT * FROM user_stats WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0] || null;
  }

  /**
   * List users with filters
   */
  static async list(filters: {
    role?: string;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.role) {
      conditions.push(`role = $${paramCount++}`);
      values.push(filters.role);
    }
    if (filters.isVerified !== undefined) {
      conditions.push(`is_verified = $${paramCount++}`);
      values.push(filters.isVerified);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await query<User>(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`,
      [...values, limit, offset]
    );

    return result.rows;
  }

  /**
   * Delete user (soft delete - mark as inactive in production)
   */
  static async delete(id: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [id]);
  }
}
