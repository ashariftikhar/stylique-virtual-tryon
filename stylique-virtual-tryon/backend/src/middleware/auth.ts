import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'stylique-dev-secret-change-me';

export interface AuthenticatedRequest extends Request {
  storeAuth?: {
    storeId: string;   // UUID
    store_id: string;  // slug / domain
  };
}

/**
 * Middleware that verifies a JWT from either:
 *   1. Authorization: Bearer <token>
 *   2. store_session cookie (JSON with a `token` field)
 *
 * Skipped paths (configured in index.ts via selective mounting):
 *   /api/auth/*, /api/health, /plugin/*
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // 2. Fall back to store_session cookie
    if (!token) {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const sessionCookie = cookieHeader
          .split(';')
          .map(c => c.trim())
          .find(c => c.startsWith('store_session='));

        if (sessionCookie) {
          try {
            const cookieValue = decodeURIComponent(sessionCookie.split('=').slice(1).join('='));
            const parsed = JSON.parse(cookieValue);
            if (parsed.token) {
              token = parsed.token;
            }
          } catch {
            // Cookie is malformed – fall through to 401
          }
        }
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { storeId: string; store_id: string };

    req.storeAuth = {
      storeId: decoded.storeId,
      store_id: decoded.store_id,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired, please log in again' });
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
