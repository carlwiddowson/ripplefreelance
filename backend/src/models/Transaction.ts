import { query } from '../db';
import { Transaction } from '../db';

export class TransactionModel {
  /**
   * Create a new transaction record
   */
  static async create(data: {
    xrpl_tx_hash: string;
    from_wallet: string;
    to_wallet: string;
    amount_xrp?: number;
    amount_rlusd?: number;
    tx_type: 'payment' | 'escrow_create' | 'escrow_finish' | 'escrow_cancel';
    gig_id?: string;
    status?: 'pending' | 'confirmed' | 'failed';
    metadata?: any;
  }): Promise<Transaction> {
    const result = await query<Transaction>(
      `INSERT INTO transactions (xrpl_tx_hash, from_wallet, to_wallet, amount_xrp, amount_rlusd, tx_type, gig_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.xrpl_tx_hash,
        data.from_wallet,
        data.to_wallet,
        data.amount_xrp || null,
        data.amount_rlusd || null,
        data.tx_type,
        data.gig_id || null,
        data.status || 'pending',
        JSON.stringify(data.metadata || {}),
      ]
    );
    return result.rows[0];
  }

  /**
   * Find transaction by XRPL hash
   */
  static async findByHash(xrplTxHash: string): Promise<Transaction | null> {
    const result = await query<Transaction>(
      'SELECT * FROM transactions WHERE xrpl_tx_hash = $1',
      [xrplTxHash]
    );
    return result.rows[0] || null;
  }

  /**
   * Find transaction by ID
   */
  static async findById(id: string): Promise<Transaction | null> {
    const result = await query<Transaction>(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update transaction status
   */
  static async updateStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'failed',
    confirmedAt?: Date
  ): Promise<Transaction | null> {
    const result = await query<Transaction>(
      `UPDATE transactions 
       SET status = $1, confirmed_at = $2 
       WHERE id = $3 
       RETURNING *`,
      [status, confirmedAt || null, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get transactions by gig
   */
  static async findByGigId(gigId: string): Promise<Transaction[]> {
    const result = await query<Transaction>(
      'SELECT * FROM transactions WHERE gig_id = $1 ORDER BY created_at DESC',
      [gigId]
    );
    return result.rows;
  }

  /**
   * Get transactions by wallet address
   */
  static async findByWallet(walletAddress: string, filters?: {
    tx_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    const conditions = ['(from_wallet = $1 OR to_wallet = $1)'];
    const values: any[] = [walletAddress];
    let paramCount = 2;

    if (filters?.tx_type) {
      conditions.push(`tx_type = $${paramCount++}`);
      values.push(filters.tx_type);
    }

    if (filters?.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await query<Transaction>(
      `SELECT * FROM transactions 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      [...values, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get transaction statistics for a wallet
   */
  static async getStats(walletAddress: string): Promise<{
    total_sent: number;
    total_received: number;
    total_transactions: number;
    pending_transactions: number;
  }> {
    const result = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN from_wallet = $1 THEN COALESCE(amount_xrp, 0) END), 0) as total_sent,
        COALESCE(SUM(CASE WHEN to_wallet = $1 THEN COALESCE(amount_xrp, 0) END), 0) as total_received,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions
       FROM transactions
       WHERE from_wallet = $1 OR to_wallet = $1`,
      [walletAddress]
    );
    return result.rows[0];
  }

  /**
   * Delete transaction (admin only, for testing)
   */
  static async delete(id: string): Promise<void> {
    await query('DELETE FROM transactions WHERE id = $1', [id]);
  }
}
