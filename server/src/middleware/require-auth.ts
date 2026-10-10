import type { RequestHandler } from 'express';
import type { AppContext } from '../app';
import { ApiFailure } from '../domain/api-error';
import { getSessionUser, readSessionCookie } from '../modules/auth/auth.service';

export function requireAuth(ctx: AppContext): RequestHandler {
  return (req, res, next) => {
    const user = getSessionUser(ctx.db, readSessionCookie(req.headers.cookie), ctx.now());
    if (!user) {
      next(new ApiFailure(401, 'UNAUTHENTICATED', 'Please sign in.'));
      return;
    }
    res.locals.user = user;
    next();
  };
}
