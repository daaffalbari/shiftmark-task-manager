import { Router } from 'express';
import { changeStatusSchema, createTaskSchema, editTaskSchema, taskViewSchema } from '@shiftmark/contracts';
import { z } from 'zod';
import type { AppContext } from '../../app';
import { requireAuth } from '../../middleware/require-auth';
import { changeTeamTaskStatus, createTeamTask, editTeamTask, getTeamTask, getTeamTaskAuditLogs, listTeamTasks, softDeleteTeamTask } from './task.service';

const taskIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export function taskRoutes(ctx: AppContext) {
  const router = Router();
  router.use(requireAuth(ctx));
  router.get('/', (req, res) => {
    const view = taskViewSchema.parse(req.query.view ?? 'active');
    res.json({ tasks: listTeamTasks(ctx.db, view) });
  });
  router.post('/', (req, res) => {
    res.status(201).json({ task: createTeamTask(ctx.db, res.locals.user.id, createTaskSchema.parse(req.body), ctx.now()) });
  });
  router.get('/:id', (req, res) => {
    res.json({ task: getTeamTask(ctx.db, taskIdSchema.parse(req.params.id)) });
  });
  router.patch('/:id', (req, res) => {
    res.json(editTeamTask(ctx.db, res.locals.user.id, taskIdSchema.parse(req.params.id), editTaskSchema.parse(req.body), ctx.now()));
  });
  router.patch('/:id/status', (req, res) => {
    const id = taskIdSchema.parse(req.params.id);
    const { status } = changeStatusSchema.parse(req.body);
    res.json(changeTeamTaskStatus(ctx.db, res.locals.user.id, id, status, ctx.now()));
  });
  router.get('/:id/audit-logs', (req, res) => {
    res.json({ logs: getTeamTaskAuditLogs(ctx.db, taskIdSchema.parse(req.params.id)) });
  });
  router.delete('/:id', (req, res) => {
    softDeleteTeamTask(ctx.db, res.locals.user.id, taskIdSchema.parse(req.params.id), ctx.now());
    res.sendStatus(204);
  });
  return router;
}
