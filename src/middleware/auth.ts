import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt';

export function auth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  if (!hdr?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token' });
  try {
    req.user = verifyJwt(hdr.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
