import * as Koa from 'koa';
import { ConflictError, NotAuthenticatedError, NotFoundError, ValidationError } from '../errors';

export function errorHandler() {
  return async function (ctx: Koa.Context, next: Koa.Next) {
    try {
      await next();
    } catch (err) {
      if (err instanceof ValidationError) {
        ctx.status = 400;
        ctx.body = { status: 400, field: err.field, message: err.error };
      } else if (err instanceof NotAuthenticatedError) {
        ctx.status = 401;
        ctx.set('WWW-Authenticate', 'Bearer');
        ctx.body = { status: 401, message: 'not_authenticated' };
      } else if (err instanceof NotFoundError) {
        ctx.status = 404;
        ctx.body = { status: 404, field: err.field, message: err.message || 'not_found' };
      } else if (err instanceof ConflictError) {
        ctx.status = 409;
        ctx.body = { status: 409, field: err.field, message: err.message || 'conflict' };
      } else {
        ctx.status = 500;
        ctx.body = { status: 500, message: 'internal_server_error' };

        console.error(err);
      }
    }
  };
}
