import type { RequestHandler } from 'express';
import { ApiFailure } from '../domain/api-error';

export function requireOrigin(origin: string): RequestHandler {
  return (req, _res, next) => {
    if (['POST', 'PATCH', 'DELETE'].includes(req.method) && req.get('Origin') !== origin) {
      next(new ApiFailure(403, 'INVALID_ORIGIN', 'Request origin is not allowed.'));
      return;
    }
    next();
  };
}
