import { asc } from 'drizzle-orm';
import { Router } from 'express';
import type { AppContext } from '../../app';
import { users } from '../../db/schema';
import { requireAuth } from '../../middleware/require-auth';

export function memberRoutes(ctx: AppContext) {
  const router = Router();
  router.use(requireAuth(ctx));
  router.get('/', (_req, res) => {
    res.json({ members: ctx.db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name), asc(users.id)).all() });
  });
  return router;
}
