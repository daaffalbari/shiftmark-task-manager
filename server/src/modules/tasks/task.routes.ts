import { Router } from 'express';
import { createTaskSchema, taskViewSchema } from '@shiftmark/contracts';
import type { AppContext } from '../../app';
import { requireAuth } from '../../middleware/require-auth';
import { createOwnedTask, listOwnedTasks } from './task.service';

export function taskRoutes(ctx: AppContext) {
  const router = Router();
  router.use(requireAuth(ctx));
  router.get('/', (req, res) => {
    const view = taskViewSchema.parse(req.query.view ?? 'active');
    res.json({ tasks: listOwnedTasks(ctx.db, res.locals.user.id, view) });
  });
  router.post('/', (req, res) => {
    const { title } = createTaskSchema.parse(req.body);
    res.status(201).json({ task: createOwnedTask(ctx.db, res.locals.user.id, title, ctx.now()) });
  });
  return router;
}
