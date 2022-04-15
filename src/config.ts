import dotenv from 'dotenv';
import { env } from 'process';

dotenv.config();

export const config = {
  auth: {
    token: env.AUTH_TOKEN || '',
  },
  db: env.DB || 'sqlite',
  sqlite: {
    path: env.SQLITE_PATH || ':memory:',
  },
  pgsql: {
    host: env.PGSQL_HOST || 'localhost',
    port: +(env.PGSQL_PORT || 5432),
    database: env.PGSQL_DATABASE || 'imageboard',
    user: env.PGSQL_USER || 'imageboard',
    password: env.PGSQL_PASSWORD || 'imageboard',
  },
  http: {
    port: +(env.HTTP_PORT || 3000),
  },
  ffprobe: {
    path: env.FFPROBE_PATH || 'ffprobe',
  },
  ffmpeg: {
    path: env.FFMPEG_PATH || 'ffmpeg',
  },
  queue: env.QUEUE || 'dummy',
  rabbit: {
    host: env.RABBIT_HOST || 'amqp://127.0.0.1:5672',
  },
};

export default config;
