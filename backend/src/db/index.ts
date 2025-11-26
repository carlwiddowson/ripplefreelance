import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

// Database connection pool
let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(connectionString: string): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Log connection errors
  pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
  });

  logger.info('Database pool initialized');
  return pool;
}

/**
 * Get database pool
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await getPool().query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
    return result;
  } catch (error) {
    logger.error('Database query error:', { text, params, error });
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

// Database helper types
export interface User {
  id: string;
  wallet_address: string;
  email?: string;
  phone_number?: string;
  role: 'freelancer' | 'client' | 'both';
  profile_data: any;
  reputation_score: number;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Gig {
  id: string;
  freelancer_id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  price_usd: number;
  estimated_delivery_days: number;
  milestones: any[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  xrpl_tx_hash: string;
  from_wallet: string;
  to_wallet: string;
  amount_xrp?: number;
  amount_rlusd?: number;
  tx_type: 'payment' | 'escrow_create' | 'escrow_finish' | 'escrow_cancel';
  gig_id?: string;
  status: 'pending' | 'confirmed' | 'failed';
  metadata: any;
  created_at: Date;
  confirmed_at?: Date;
}

export interface Escrow {
  id: string;
  xrpl_sequence_number: number;
  gig_id: string;
  client_wallet: string;
  freelancer_wallet: string;
  amount_xrp: number;
  condition_hash: string;
  fulfillment_hash: string;
  finish_after?: Date;
  cancel_after: Date;
  status: 'created' | 'released' | 'cancelled' | 'expired';
  release_tx_hash?: string;
  created_at: Date;
  updated_at: Date;
}
