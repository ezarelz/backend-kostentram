import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types';

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) throw new Error('JWT_SECRET missing');

export function signJwt(payload: JwtPayload, opts?: jwt.SignOptions) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d', ...opts });
}
export function verifyJwt(token: string) {
  return jwt.verify(token, SECRET) as JwtPayload;
}
