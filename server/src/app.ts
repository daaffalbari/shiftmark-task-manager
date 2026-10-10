import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { Db } from './db/client';
import { ApiFailure } from './domain/api-error';
import { requireOrigin } from './middleware/require-origin';
import { authRoutes } from './modules/auth/auth.routes';

export interface AppContext { db: Db; origin: string; secureCookies: boolean; now: () => Date }

export function createApp(ctx: AppContext) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(requireOrigin(ctx.origin));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/auth', authRoutes(ctx));
  app.use((_req, _res, next) => next(new ApiFailure(404, 'NOT_FOUND', 'Route not found.')));
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiFailure) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
    } else if (error instanceof ZodError || error?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check your request.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
    }
  };
  app.use(handleError);
  return app;
}
