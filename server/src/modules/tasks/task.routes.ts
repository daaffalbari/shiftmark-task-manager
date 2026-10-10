import { Router } from 'express';
import { changeStatusSchema, createTaskSchema, taskViewSchema } from '@shiftmark/contracts';
import { z } from 'zod';
import type { AppContext } from '../../app';
import { requireAuth } from '../../middleware/require-auth';
import { changeOwnedTaskStatus, createOwnedTask, listOwnedTasks } from './task.service';

const taskIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

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
  router.patch('/:id/status', (req, res) => {
    const id = taskIdSchema.parse(req.params.id);
    const { status } = changeStatusSchema.parse(req.body);
    res.json(changeOwnedTaskStatus(ctx.db, res.locals.user.id, id, status, ctx.now()));
  });
  return router;
}
