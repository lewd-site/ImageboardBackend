import config from './config';
import Container from './container';
import DummyQueue from './queues/dummy';
import LogQueue from './queues/log';
import RabbitQueue from './queues/rabbitmq';
import PgsqlConnectionFactory from './repositories/pgsql/connection-factory';
import SqliteConnectionFactory from './repositories/sqlite/connection-factory';

export const CONNECTION_FACTORY = 'ConnectionFactory';
export const CONNECTION = 'Connection';
export const REPOSITORY_FACTORY = 'RepositoryFactory';
export const BOARD_REPOSITORY = 'BoardRepository';
export const THREAD_REPOSITORY = 'ThreadRepository';
export const POST_REPOSITORY = 'PostRepository';
export const FILE_REPOSITORY = 'FileRepository';
export const EMBED_REPOSITORY = 'EmbedRepository';
export const QUEUE = 'Queue';
export const OEMBED = 'OEmbed';
export const BOARD_CONTROLLER = 'BoardController';
export const THREAD_CONTROLLER = 'ThreadController';
export const POST_CONTROLLER = 'PostController';
export const FILE_CONTROLLER = 'FileController';

export function registerServices(container: Container) {
  switch (config.db) {
    case 'sqlite':
      container.registerFactory(CONNECTION_FACTORY, { create: async () => new SqliteConnectionFactory() });
      break;

    case 'pgsql':
      container.registerFactory(CONNECTION_FACTORY, { create: async () => new PgsqlConnectionFactory() });
      break;
  }

  switch (config.queue) {
    case 'dummy':
      container.registerFactory(QUEUE, { create: async () => new DummyQueue() });
      break;

    case 'log':
      container.registerFactory(QUEUE, { create: async () => new LogQueue() });
      break;

    case 'rabbit':
      container.registerFactory(QUEUE, {
        async create() {
          const queue = new RabbitQueue();
          queue.connect();

          return queue;
        },
      });
      break;
  }
}

export default registerServices;
