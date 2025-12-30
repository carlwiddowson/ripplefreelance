import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test database helpers
 */
export class TestDatabase {
  private static pool: Pool | null = null;

  static getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }
    return this.pool;
  }

  static async query(text: string, params?: any[]): Promise<any> {
    const pool = this.getPool();
    return pool.query(text, params);
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  static async clean(): Promise<void> {
    // Clean up test data - delete in reverse order of foreign keys
    await this.query('DELETE FROM sessions');
    await this.query('DELETE FROM escrows');
    await this.query('DELETE FROM transactions');
    await this.query('DELETE FROM reviews');
    await this.query('DELETE FROM gigs');
    await this.query('DELETE FROM users');
  }
}

/**
 * Test data factories
 */
export const TestData = {
  user: (overrides?: Partial<any>) => ({
    wallet_address: `r${uuidv4().replace(/-/g, '').substring(0, 33)}`,
    email: `test-${uuidv4()}@example.com`,
    role: 'freelancer' as const,
    profile_data: { name: 'Test User' },
    ...overrides,
  }),

  gig: (freelancer_id: string, overrides?: Partial<any>) => ({
    freelancer_id,
    title: 'Test Gig',
    description: 'This is a test gig for automated testing purposes',
    category: 'Web Development',
    skills: ['TypeScript', 'Node.js'],
    price_usd: 100,
    estimated_delivery_days: 7,
    milestones: [],
    ...overrides,
  }),

  transaction: (overrides?: Partial<any>) => ({
    xrpl_tx_hash: uuidv4().replace(/-/g, '').padEnd(64, '0'),
    from_wallet: `r${uuidv4().replace(/-/g, '').substring(0, 33)}`,
    to_wallet: `r${uuidv4().replace(/-/g, '').substring(0, 33)}`,
    amount_xrp: 10,
    tx_type: 'payment' as const,
    status: 'confirmed' as const,
    ...overrides,
  }),

  escrow: (overrides?: Partial<any>) => ({
    xrpl_sequence_number: Math.floor(Math.random() * 1000000),
    condition_hash: uuidv4().replace(/-/g, '').padEnd(64, '0'),
    fulfillment: uuidv4().replace(/-/g, '').padEnd(64, '0'),
    cancel_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    ...overrides,
  }),
};

/**
 * Mock XRPL client
 */
export const mockXRPLClient = () => {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    request: jest.fn().mockResolvedValue({
      result: {
        account_data: {
          Balance: '10000000', // 10 XRP in drops
        },
      },
    }),
    submitAndWait: jest.fn().mockResolvedValue({
      result: {
        hash: '1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF',
        meta: {
          TransactionResult: 'tesSUCCESS',
        },
      },
    }),
  };
};

/**
 * Generate a test JWT token
 */
export const generateTestToken = (userId: string): string => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Wait for a condition with timeout
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
};
