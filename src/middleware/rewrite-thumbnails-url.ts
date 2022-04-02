import Koa from 'koa';

const THUMBNAILS_PREFIX = '/thumbnails';
const API_PREFIX = '/api/v1';

export function rewriteThumbnailUrls() {
  return async function (ctx: Koa.Context, next: Koa.Next) {
    if (!ctx.url.startsWith(THUMBNAILS_PREFIX)) {
      return next();
    }

    const originalUrl = ctx.url;
    ctx.url = API_PREFIX + ctx.url;

    await next();

    ctx.url = originalUrl;
  };
}

export default rewriteThumbnailUrls;
