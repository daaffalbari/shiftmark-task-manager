import { Router } from 'express';
import { loginSchema } from '@shiftmark/contracts';
import type { AppContext } from '../../app';
import { ApiFailure } from '../../domain/api-error';
import { requireAuth } from '../../middleware/require-auth';
import { login, logout, readSessionCookie, sessionLifetimeMs } from './auth.service';

export function authRoutes(ctx: AppContext) {
  const router = Router();
  const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: ctx.secureCookies };
  router.post('/login', async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(ctx.db, email, password, ctx.now());
    if (!result) throw new ApiFailure(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    res.cookie('shiftmark_session', result.token, { ...cookieOptions, maxAge: sessionLifetimeMs });
    res.json({ user: result.user });
  });
  router.get('/me', requireAuth(ctx), (_req, res) => res.json({ user: res.locals.user }));
  router.post('/logout', (req, res) => {
    logout(ctx.db, readSessionCookie(req.headers.cookie));
    res.clearCookie('shiftmark_session', cookieOptions).sendStatus(204);
  });
  return router;
}
