import dotenv from 'dotenv';
import { env } from 'process';

dotenv.config();

export const config = {
  auth: {
    token: env.AUTH_TOKEN || '',
  },
  db: {
    path: env.DB_PATH || ':memory:',
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
  rabbit: {
    host: env.RABBIT_HOST || 'amqp://127.0.0.1:5672',
  },
};

export default config;
