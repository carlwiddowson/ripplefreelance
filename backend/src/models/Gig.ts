import { query } from '../db';
import { Gig } from '../db';

export class GigModel {
  /**
   * Create a new gig
   */
  static async create(data: {
    freelancer_id: string;
    title: string;
    description: string;
    category: string;
    skills?: string[];
    price_usd: number;
    price_xrp?: number;
    price_rlusd?: number;
    currency?: 'XRP' | 'RLUSD' | 'BOTH';
    estimated_delivery_days: number;
    milestones?: any[];
  }): Promise<Gig> {
    const currency = data.currency || 'XRP';
    const result = await query<Gig>(
      `INSERT INTO gigs (freelancer_id, title, description, category, skills, price_usd, price_xrp, price_rlusd, currency, estimated_delivery_days, milestones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.freelancer_id,
        data.title,
        data.description,
        data.category,
        JSON.stringify(data.skills || []),
        data.price_usd,
        data.price_xrp || null,
        data.price_rlusd || null,
        currency,
        data.estimated_delivery_days,
        JSON.stringify(data.milestones || []),
      ]
    );
    return result.rows[0];
  }

  /**
   * Find gig by ID
   */
  static async findById(id: string): Promise<Gig | null> {
    const result = await query<Gig>(
      'SELECT * FROM gigs WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update gig
   */
  static async update(
    id: string,
    freelancer_id: string,
    data: Partial<Pick<Gig, 'title' | 'description' | 'category' | 'skills' | 'price_usd' | 'price_xrp' | 'price_rlusd' | 'currency' | 'estimated_delivery_days' | 'milestones' | 'status'>>
  ): Promise<Gig | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(data.category);
    }
    if (data.skills !== undefined) {
      updates.push(`skills = $${paramCount++}`);
      values.push(JSON.stringify(data.skills));
    }
    if (data.price_usd !== undefined) {
      updates.push(`price_usd = $${paramCount++}`);
      values.push(data.price_usd);
    }
    if (data.price_xrp !== undefined) {
      updates.push(`price_xrp = $${paramCount++}`);
      values.push(data.price_xrp);
    }
    if (data.price_rlusd !== undefined) {
      updates.push(`price_rlusd = $${paramCount++}`);
      values.push(data.price_rlusd);
    }
    if (data.currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(data.currency);
    }
    if (data.estimated_delivery_days !== undefined) {
      updates.push(`estimated_delivery_days = $${paramCount++}`);
      values.push(data.estimated_delivery_days);
    }
    if (data.milestones !== undefined) {
      updates.push(`milestones = $${paramCount++}`);
      values.push(JSON.stringify(data.milestones));
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id, freelancer_id);
    const result = await query<Gig>(
      `UPDATE gigs SET ${updates.join(', ')} WHERE id = $${paramCount} AND freelancer_id = $${paramCount + 1} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update gig status
   */
  static async updateStatus(id: string, status: Gig['status']): Promise<void> {
    await query(
      'UPDATE gigs SET status = $1 WHERE id = $2',
      [status, id]
    );
  }

  /**
   * List gigs with filters
   */
  static async list(filters: {
    freelancer_id?: string;
    category?: string;
    status?: string;
    min_price?: number;
    max_price?: number;
    limit?: number;
    offset?: number;
  }): Promise<Gig[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.freelancer_id) {
      conditions.push(`freelancer_id = $${paramCount++}`);
      values.push(filters.freelancer_id);
    }
    if (filters.category) {
      conditions.push(`category = $${paramCount++}`);
      values.push(filters.category);
    }
    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (filters.min_price !== undefined) {
      conditions.push(`price_usd >= $${paramCount++}`);
      values.push(filters.min_price);
    }
    if (filters.max_price !== undefined) {
      conditions.push(`price_usd <= $${paramCount++}`);
      values.push(filters.max_price);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await query<Gig>(
      `SELECT * FROM gigs ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`,
      [...values, limit, offset]
    );

    return result.rows;
  }

  /**
   * Delete gig (only if status is 'open')
   */
  static async delete(id: string, freelancer_id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM gigs WHERE id = $1 AND freelancer_id = $2 AND status = $3',
      [id, freelancer_id, 'open']
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get gigs by freelancer
   */
  static async findByFreelancer(freelancer_id: string): Promise<Gig[]> {
    const result = await query<Gig>(
      'SELECT * FROM gigs WHERE freelancer_id = $1 ORDER BY created_at DESC',
      [freelancer_id]
    );
    return result.rows;
  }
}
