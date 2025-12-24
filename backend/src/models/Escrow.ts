import { query } from '../db';
import { Escrow } from '../db';
import { encrypt, decrypt } from '../utils/encryption';

export class EscrowModel {
  /**
   * Create a new escrow record
   */
  static async create(data: {
    xrpl_sequence_number: number;
    gig_id: string;
    client_wallet: string;
    freelancer_wallet: string;
    amount_xrp: number;
    condition_hash: string;
    fulfillment: string; // Will be encrypted
    finish_after?: Date;
    cancel_after: Date;
    status?: 'created' | 'released' | 'cancelled' | 'expired';
  }): Promise<Escrow> {
    // Encrypt the fulfillment before storing
    const encryptedFulfillment = encrypt(data.fulfillment);

    const result = await query<Escrow>(
      `INSERT INTO escrows (
        xrpl_sequence_number, gig_id, client_wallet, freelancer_wallet, 
        amount_xrp, condition_hash, fulfillment_hash, finish_after, 
        cancel_after, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.xrpl_sequence_number,
        data.gig_id,
        data.client_wallet,
        data.freelancer_wallet,
        data.amount_xrp,
        data.condition_hash,
        encryptedFulfillment,
        data.finish_after || null,
        data.cancel_after,
        data.status || 'created',
      ]
    );
    return result.rows[0];
  }

  /**
   * Find escrow by ID
   */
  static async findById(id: string): Promise<Escrow | null> {
    const result = await query<Escrow>(
      'SELECT * FROM escrows WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find escrow by gig ID
   */
  static async findByGigId(gigId: string): Promise<Escrow[]> {
    const result = await query<Escrow>(
      'SELECT * FROM escrows WHERE gig_id = $1 ORDER BY created_at DESC',
      [gigId]
    );
    return result.rows;
  }

  /**
   * Find active escrow by gig ID
   */
  static async findActiveByGigId(gigId: string): Promise<Escrow | null> {
    const result = await query<Escrow>(
      "SELECT * FROM escrows WHERE gig_id = $1 AND status = 'created' ORDER BY created_at DESC LIMIT 1",
      [gigId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find escrows by wallet address
   */
  static async findByWallet(walletAddress: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Escrow[]> {
    const conditions = ['(client_wallet = $1 OR freelancer_wallet = $1)'];
    const values: any[] = [walletAddress];
    let paramCount = 2;

    if (filters?.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = await query<Escrow>(
      `SELECT * FROM escrows 
       WHERE ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramCount++} OFFSET $${paramCount}`,
      [...values, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get decrypted fulfillment (only for release)
   */
  static async getFulfillment(id: string): Promise<string> {
    const escrow = await this.findById(id);
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'created') {
      throw new Error('Escrow is not in created status');
    }

    try {
      return decrypt(escrow.fulfillment_hash);
    } catch (error) {
      throw new Error(`Failed to decrypt fulfillment: ${error}`);
    }
  }

  /**
   * Update escrow status
   */
  static async updateStatus(
    id: string,
    status: 'created' | 'released' | 'cancelled' | 'expired',
    releaseTxHash?: string
  ): Promise<Escrow | null> {
    const result = await query<Escrow>(
      `UPDATE escrows 
       SET status = $1, release_tx_hash = $2 
       WHERE id = $3 
       RETURNING *`,
      [status, releaseTxHash || null, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Mark escrow as released
   */
  static async markReleased(id: string, txHash: string): Promise<Escrow | null> {
    return this.updateStatus(id, 'released', txHash);
  }

  /**
   * Mark escrow as cancelled
   */
  static async markCancelled(id: string, txHash: string): Promise<Escrow | null> {
    return this.updateStatus(id, 'cancelled', txHash);
  }

  /**
   * Mark escrow as expired
   */
  static async markExpired(id: string): Promise<Escrow | null> {
    return this.updateStatus(id, 'expired');
  }

  /**
   * Get escrow statistics for a wallet
   */
  static async getStats(walletAddress: string): Promise<{
    total_escrows_created: number;
    total_escrows_received: number;
    active_escrows: number;
    total_amount_in_escrow: number;
  }> {
    const result = await query(
      `SELECT 
        COUNT(CASE WHEN client_wallet = $1 THEN 1 END) as total_escrows_created,
        COUNT(CASE WHEN freelancer_wallet = $1 THEN 1 END) as total_escrows_received,
        COUNT(CASE WHEN status = 'created' AND (client_wallet = $1 OR freelancer_wallet = $1) THEN 1 END) as active_escrows,
        COALESCE(SUM(CASE WHEN status = 'created' AND (client_wallet = $1 OR freelancer_wallet = $1) THEN amount_xrp ELSE 0 END), 0) as total_amount_in_escrow
       FROM escrows
       WHERE client_wallet = $1 OR freelancer_wallet = $1`,
      [walletAddress]
    );
    return result.rows[0];
  }

  /**
   * Get expired escrows that need auto-cancellation
   */
  static async findExpiredEscrows(): Promise<Escrow[]> {
    const result = await query<Escrow>(
      `SELECT * FROM escrows 
       WHERE status = 'created' 
       AND cancel_after < NOW() 
       ORDER BY cancel_after ASC`,
      []
    );
    return result.rows;
  }

  /**
   * Delete escrow (admin only, for testing)
   */
  static async delete(id: string): Promise<void> {
    await query('DELETE FROM escrows WHERE id = $1', [id]);
  }
}
