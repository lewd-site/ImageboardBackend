import * as Koa from 'koa';
import config from '../config';
import { NotAuthenticatedError } from '../errors';

export function auth() {
  return async function (ctx: Koa.Context, next: Koa.Next) {
    if (ctx.get('Authorization') !== `Bearer ${config.auth.token}`) {
      throw new NotAuthenticatedError();
    }

    await next();
  };
}
