import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { createHash } from 'crypto';
// import { verifySignature, Wallet } from 'xrpl'; // Not used yet
import { UserModel } from '../models/User';
import { query } from '../db';
import { logger } from '../utils/logger';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthTokenPayload {
  userId: string;
  walletAddress: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    wallet_address: string;
    email?: string;
    role: string;
    profile_data: any;
    reputation_score: number;
    is_verified: boolean;
  };
}

export class AuthService {
  /**
   * Generate JWT token
   */
  static generateToken(payload: AuthTokenPayload): string {
    const options: SignOptions = {
      expiresIn: JWT_EXPIRES_IN as StringValue | number,
    };
    return jwt.sign(payload, JWT_SECRET, options);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Create session in database
   */
  static async createSession(userId: string, token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await query(
      'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
  }

  /**
   * Validate session exists and is not expired
   */
  static async validateSession(userId: string, token: string): Promise<boolean> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const result = await query(
      'SELECT * FROM sessions WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()',
      [userId, tokenHash]
    );
    return result.rows.length > 0;
  }

  /**
   * Delete session (logout)
   */
  static async deleteSession(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    await query('DELETE FROM sessions WHERE expires_at < NOW()');
  }

  /**
   * Verify XRPL wallet signature (simplified for MVP)
   * In production, use Xaman SDK for proper verification
   * 
   * Flow:
   * 1. Client signs a message with their wallet
   * 2. Backend verifies the signature matches the wallet address
   * 3. If valid, create/login user
   */
  static verifyWalletSignature(
    walletAddress: string,
    _message: string,
    signature: string
  ): boolean {
    try {
      // For MVP, we'll implement basic verification
      // In production, integrate Xaman SDK or xrpl.js signature verification
      
      // The message should be a known challenge (e.g., timestamp + nonce)
      // to prevent replay attacks
      
      // Simplified validation - check signature format
      if (!signature || signature.length < 64) {
        return false;
      }

      // Validate wallet address format
      const addressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
      if (!addressRegex.test(walletAddress)) {
        return false;
      }

      // TODO: Implement proper XRPL signature verification
      // For now, return true for development (TESTNET ONLY)
      logger.warn('Using simplified signature verification - NOT FOR PRODUCTION');
      return true;
    } catch (error) {
      logger.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Authenticate or register user with wallet
   */
static async authenticateWithWallet(data: {
    wallet_address: string;
    signature: string;
    message: string;
    role?: 'freelancer' | 'client' | 'both';
    email?: string;
    phone_number?: string;
  }): Promise<AuthResponse> {
    // Verify signature
    const isValid = this.verifyWalletSignature(
      data.wallet_address,
      data.message,
      data.signature
    );

    if (!isValid) {
      throw new Error('Invalid wallet signature');
    }

    // Check if user exists
    let user = await UserModel.findByWalletAddress(data.wallet_address);

    // Create user if doesn't exist (first-time login)
    if (!user) {
      user = await UserModel.create({
        wallet_address: data.wallet_address,
        email: data.email,
        phone_number: data.phone_number,
        role: data.role || 'both',
        profile_data: {},
      });
      logger.info(`New user registered: ${user.wallet_address}`);
    }

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      walletAddress: user.wallet_address,
      role: user.role,
    });

    // Create session
    await this.createSession(user.id, token);

    return {
      token,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        role: user.role,
        profile_data: user.profile_data,
        reputation_score: user.reputation_score,
        is_verified: user.is_verified,
      },
    };
  }

  /**
   * Get challenge message for wallet signing
   * This prevents replay attacks
   */
  static generateChallenge(walletAddress: string): string {
    const timestamp = Date.now();
    const nonce = createHash('sha256')
      .update(`${walletAddress}${timestamp}${Math.random()}`)
      .digest('hex')
      .substring(0, 16);

    return `Sign this message to authenticate with RippleFreelance\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
  }

  /**
   * Verify challenge timestamp (within 5 minutes)
   */
  static verifyChallengeTimestamp(message: string): boolean {
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) return false;

    const timestamp = parseInt(timestampMatch[1]);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return now - timestamp < fiveMinutes;
  }

  /**
   * Refresh token (extend session)
   */
  static async refreshToken(oldToken: string): Promise<string> {
    const payload = this.verifyToken(oldToken);
    
    // Verify session exists
    const isValid = await this.validateSession(payload.userId, oldToken);
    if (!isValid) {
      throw new Error('Invalid session');
    }

    // Delete old session
    await this.deleteSession(oldToken);

    // Generate new token
    const newToken = this.generateToken({
      userId: payload.userId,
      walletAddress: payload.walletAddress,
      role: payload.role,
    });

    // Create new session
    await this.createSession(payload.userId, newToken);

    return newToken;
  }
}
