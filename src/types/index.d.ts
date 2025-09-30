import 'express-serve-static-core';

export type JwtPayload = { userId: number; email: string };

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}
