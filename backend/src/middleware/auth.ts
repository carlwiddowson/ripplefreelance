import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        wallet_address: string;
        role: string;
      };
    }
  }
}

/**
 * Authenticate user via JWT token in Authorization header
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = AuthService.verifyToken(token);

    // Validate session exists
    const isValid = await AuthService.validateSession(payload.userId, token);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    // Attach user to request
    req.user = {
      id: payload.userId,
      wallet_address: payload.walletAddress,
      role: payload.role,
    };

    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'both') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = AuthService.verifyToken(token);
      const isValid = await AuthService.validateSession(payload.userId, token);

      if (isValid) {
        req.user = {
          id: payload.userId,
          wallet_address: payload.walletAddress,
          role: payload.role,
        };
      }
    }

    next();
  } catch (error) {
    // Fail silently for optional auth
    next();
  }
}
