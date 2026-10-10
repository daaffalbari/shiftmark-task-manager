import { Router } from 'express';
import { changeStatusSchema, createTaskSchema, deleteTaskSchema, editTaskSchema, taskViewSchema } from '@shiftmark/contracts';
import { z } from 'zod';
import type { AppContext } from '../../app';
import { changeTeamTaskStatus, createTeamTask, editTeamTask, getTeamTask, getTeamTaskAuditLogs, listTeamTasks, softDeleteTeamTask } from './task.service';

const taskIdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export function taskRoutes(ctx: AppContext) {
  const router = Router();
  router.get('/', (req, res) => {
    const view = taskViewSchema.parse(req.query.view ?? 'active');
    res.json({ tasks: listTeamTasks(ctx.db, view) });
  });
  router.post('/', (req, res) => {
    const { actorId, ...input } = createTaskSchema.parse(req.body);
    res.status(201).json({ task: createTeamTask(ctx.db, actorId, input, ctx.now()) });
  });
  router.get('/:id', (req, res) => {
    res.json({ task: getTeamTask(ctx.db, taskIdSchema.parse(req.params.id)) });
  });
  router.patch('/:id', (req, res) => {
    const { actorId, ...input } = editTaskSchema.parse(req.body);
    res.json(editTeamTask(ctx.db, actorId, taskIdSchema.parse(req.params.id), input, ctx.now()));
  });
  router.patch('/:id/status', (req, res) => {
    const id = taskIdSchema.parse(req.params.id);
    const { status, actorId } = changeStatusSchema.parse(req.body);
    res.json(changeTeamTaskStatus(ctx.db, actorId, id, status, ctx.now()));
  });
  router.get('/:id/audit-logs', (req, res) => {
    res.json({ logs: getTeamTaskAuditLogs(ctx.db, taskIdSchema.parse(req.params.id)) });
  });
  router.delete('/:id', (req, res) => {
    const { actorId } = deleteTaskSchema.parse(req.body);
    softDeleteTeamTask(ctx.db, actorId, taskIdSchema.parse(req.params.id), ctx.now());
    res.sendStatus(204);
  });
  return router;
}
