import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.js';

export interface AuthRequest extends Request {
  user: { id: string; email: string };
}

/**
 * JWT auth middleware. Extracts user from Authorization header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
