import Koa, { Context } from 'koa';
import logger from 'koa-logger';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import multer from '@koa/multer';
import helmet from 'koa-helmet';
import cors from '@koa/cors';
import conditional from 'koa-conditional-get';
import etag from 'koa-etag';
import serve from 'koa-static';
import { ClientBase, PoolClient } from 'pg';
import sqlite3 from 'sqlite3';
import config from './config';
import Container from './container';
import BoardController from './controllers/api/board-controller';
import ThreadController from './controllers/api/thread-controller';
import PostController from './controllers/api/post-controller';
import FileController from './controllers/api/file-controller';
import auth from './middleware/auth';
import errorHandler from './middleware/error-handler';
import rewriteThumbnailUrls from './middleware/rewrite-thumbnails-url';
import IRepositoryFactory from './models/repository-factory';
import IFileRepository from './models/file-repository';
import IBoardRepository from './models/board-repository';
import IThreadRepository from './models/thread-repository';
import IPostRepository from './models/post-repository';
import BoardManager from './models/board-manager';
import FileManager from './models/file-manager';
import IQueue from './models/queue';
import Thumbnailer from './thumbnailer';
import Parser from './markup/parser';
import Tokenizer from './markup/tokenizer';
import WakabaTripcodeGenerator from './wakaba-tripcode-generator';
import PgsqlConnectionFactory from './repositories/pgsql/connection-factory';
import PgsqlRepositoryFactory from './repositories/pgsql/repository-factory';
import SqliteConnectionFactory from './repositories/sqlite/connection-factory';
import SqliteRepositoryFactory from './repositories/sqlite/repository-factory';
import {
  BOARD_CONTROLLER,
  BOARD_REPOSITORY,
  CONNECTION,
  CONNECTION_FACTORY,
  FILE_CONTROLLER,
  FILE_REPOSITORY,
  POST_CONTROLLER,
  POST_REPOSITORY,
  QUEUE,
  REPOSITORY_FACTORY,
  THREAD_CONTROLLER,
  THREAD_REPOSITORY,
} from './services';

const MS_IN_WEEK = 1000 * 60 * 60 * 24 * 7;

export function registerScopedServices(container: Container) {
  if (config.db === 'sqlite') {
    container.registerFactory(CONNECTION, {
      async create() {
        const connectionFactory = await container.resolve<SqliteConnectionFactory>(CONNECTION_FACTORY);
        return connectionFactory.create();
      },
      dispose(connection: sqlite3.Database) {
        return new Promise((resolve, reject) => {
          connection.close((err) => {
            if (typeof err !== 'undefined' && err !== null) {
              return reject(err);
            }

            resolve();
          });
        });
      },
    });

    container.registerFactory(REPOSITORY_FACTORY, {
      async create() {
        const connection = await container.resolve<sqlite3.Database>(CONNECTION);
        return new SqliteRepositoryFactory(connection);
      },
    });
  } else if (config.db === 'pgsql') {
    container.registerFactory(CONNECTION, {
      async create() {
        const connectionFactory = await container.resolve<PgsqlConnectionFactory>(CONNECTION_FACTORY);
        return connectionFactory.create();
      },
      async dispose(connection: PoolClient) {
        connection.release();
      },
    });

    container.registerFactory(REPOSITORY_FACTORY, {
      async create() {
        const connection = await container.resolve<ClientBase>(CONNECTION);
        return new PgsqlRepositoryFactory(connection);
      },
    });
  }

  container.registerFactory(BOARD_REPOSITORY, {
    async create() {
      const repositoryFactory = await container.resolve<IRepositoryFactory>(REPOSITORY_FACTORY);
      return repositoryFactory.createBoardRepository();
    },
  });

  container.registerFactory(THREAD_REPOSITORY, {
    async create() {
      const repositoryFactory = await container.resolve<IRepositoryFactory>(REPOSITORY_FACTORY);
      return repositoryFactory.createThreadRepository();
    },
  });

  container.registerFactory(POST_REPOSITORY, {
    async create() {
      const repositoryFactory = await container.resolve<IRepositoryFactory>(REPOSITORY_FACTORY);
      return repositoryFactory.createPostRepository();
    },
  });

  container.registerFactory(FILE_REPOSITORY, {
    async create() {
      const repositoryFactory = await container.resolve<IRepositoryFactory>(REPOSITORY_FACTORY);
      return repositoryFactory.createFileRepository();
    },
  });

  container.registerFactory(BOARD_CONTROLLER, {
    async create() {
      const boardRepository = await container.resolve<IBoardRepository>(BOARD_REPOSITORY);
      const queue = await container.resolve<IQueue>(QUEUE);
      const boardManager = new BoardManager();

      return new BoardController(boardRepository, queue, boardManager);
    },
    isSingleton: false,
  });

  container.registerFactory(THREAD_CONTROLLER, {
    async create() {
      const boardRepository = await container.resolve<IBoardRepository>(BOARD_REPOSITORY);
      const threadRepository = await container.resolve<IThreadRepository>(THREAD_REPOSITORY);
      const fileRepository = await container.resolve<IFileRepository>(FILE_REPOSITORY);
      const queue = await container.resolve<IQueue>(QUEUE);
      const tripcodeGenerator = new WakabaTripcodeGenerator();
      const tokenizer = new Tokenizer();
      const parser = new Parser();
      const thumbnailer = new Thumbnailer();
      const fileManager = new FileManager(thumbnailer);

      return new ThreadController(
        boardRepository,
        threadRepository,
        fileRepository,
        queue,
        tripcodeGenerator,
        tokenizer,
        parser,
        fileManager
      );
    },
    isSingleton: false,
  });

  container.registerFactory(POST_CONTROLLER, {
    async create() {
      const boardRepository = await container.resolve<IBoardRepository>(BOARD_REPOSITORY);
      const threadRepository = await container.resolve<IThreadRepository>(THREAD_REPOSITORY);
      const postRepository = await container.resolve<IPostRepository>(POST_REPOSITORY);
      const fileRepository = await container.resolve<IFileRepository>(FILE_REPOSITORY);
      const queue = await container.resolve<IQueue>(QUEUE);
      const tripcodeGenerator = new WakabaTripcodeGenerator();
      const tokenizer = new Tokenizer();
      const parser = new Parser();
      const thumbnailer = new Thumbnailer();
      const fileManager = new FileManager(thumbnailer);

      return new PostController(
        boardRepository,
        threadRepository,
        postRepository,
        fileRepository,
        queue,
        tripcodeGenerator,
        tokenizer,
        parser,
        fileManager
      );
    },
    isSingleton: false,
  });

  container.registerFactory(FILE_CONTROLLER, {
    async create() {
      const fileRepository = await container.resolve<IFileRepository>(FILE_REPOSITORY);
      const thumbnailer = new Thumbnailer();
      const fileManager = new FileManager(thumbnailer);

      return new FileController(fileRepository, fileManager);
    },
    isSingleton: false,
  });
}

export function createApp(container: Container, useRequestScopedContainer = true) {
  function useController(name: string, method: string) {
    return async (ctx: Context) => {
      const requestContainer = useRequestScopedContainer ? new Container(container) : container;
      registerScopedServices(requestContainer);

      try {
        const controller = (await requestContainer.resolve(name)) as any;
        await controller[method](ctx);
      } finally {
        if (useRequestScopedContainer) {
          await requestContainer.dispose();
        }
      }
    };
  }

  const router = new Router();
  const upload = multer({ dest: 'tmp/' });

  router.get(
    '/api/v1/boards/:slug/threads/:threadId/posts',
    upload.fields([]),
    useController(POST_CONTROLLER, 'index')
  );

  router.post(
    '/api/v1/boards/:slug/threads/:threadId/posts',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    useController(POST_CONTROLLER, 'create')
  );

  router.get(
    '/api/v1/boards/:slug/threads/:threadId/posts/:id',
    upload.fields([]),
    useController(POST_CONTROLLER, 'show')
  );

  router.delete('/api/v1/boards/:slug/threads/:threadId/posts/:id', auth(), useController(POST_CONTROLLER, 'delete'));

  router.get('/api/v1/boards/:slug/threads', upload.fields([]), useController(THREAD_CONTROLLER, 'index'));

  router.post(
    '/api/v1/boards/:slug/threads',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    useController(THREAD_CONTROLLER, 'create')
  );

  router.get('/api/v1/boards/:slug/threads/:threadId', upload.fields([]), useController(THREAD_CONTROLLER, 'show'));
  router.delete('/api/v1/boards/:slug/threads/:threadId', auth(), useController(THREAD_CONTROLLER, 'delete'));

  router.get('/api/v1/boards/:slug/posts', upload.fields([]), useController(POST_CONTROLLER, 'index'));

  router.post(
    '/api/v1/boards/:slug/posts',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    useController(POST_CONTROLLER, 'create')
  );

  router.get('/api/v1/boards/:slug/posts/:id', upload.fields([]), useController(POST_CONTROLLER, 'show'));
  router.delete('/api/v1/boards/:slug/posts/:id', auth(), useController(POST_CONTROLLER, 'delete'));

  router.get('/api/v1/boards', upload.fields([]), useController(BOARD_CONTROLLER, 'index'));
  router.post('/api/v1/boards', upload.fields([]), useController(BOARD_CONTROLLER, 'create'));
  router.get('/api/v1/boards/:slug', upload.fields([]), useController(BOARD_CONTROLLER, 'show'));
  router.put('/api/v1/boards/:slug', auth(), useController(BOARD_CONTROLLER, 'update'));
  router.delete('/api/v1/boards/:slug', auth(), useController(BOARD_CONTROLLER, 'delete'));

  router.get('/api/v1/threads/:threadId/posts', upload.fields([]), useController(POST_CONTROLLER, 'index'));

  router.post(
    '/api/v1/threads/:threadId/posts',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    useController(POST_CONTROLLER, 'create')
  );

  router.get('/api/v1/threads/:threadId/posts/:id', upload.fields([]), useController(POST_CONTROLLER, 'show'));
  router.delete('/api/v1/threads/:threadId/posts/:id', auth(), useController(POST_CONTROLLER, 'delete'));

  router.get('/api/v1/threads', upload.fields([]), useController(THREAD_CONTROLLER, 'index'));

  router.post(
    '/api/v1/threads',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    useController(THREAD_CONTROLLER, 'create')
  );

  router.get('/api/v1/threads/:threadId', upload.fields([]), useController(THREAD_CONTROLLER, 'show'));
  router.delete('/api/v1/threads/:threadId', auth(), useController(THREAD_CONTROLLER, 'delete'));

  router.get('/api/v1/posts', upload.fields([]), useController(POST_CONTROLLER, 'index'));
  router.post(
    '/api/v1/posts',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    useController(POST_CONTROLLER, 'create')
  );

  router.get('/api/v1/posts/:id', upload.fields([]), useController(POST_CONTROLLER, 'show'));
  router.delete('/api/v1/posts/:id', auth(), useController(POST_CONTROLLER, 'delete'));

  router.get('/api/v1/thumbnails/:hash', upload.fields([]), useController(FILE_CONTROLLER, 'createThumbnail'));

  const app = new Koa();
  if (process.env.NODE_ENV === 'development') {
    app.use(logger());
  }

  app.use(helmet.contentSecurityPolicy());
  app.use(helmet.referrerPolicy());
  app.use(helmet.noSniff());
  app.use(helmet.dnsPrefetchControl());
  app.use(helmet.hidePoweredBy());
  app.use(cors());
  app.use(conditional());
  app.use(etag());
  app.use(serve('public', { maxAge: MS_IN_WEEK }));
  app.use(rewriteThumbnailUrls());
  app.use(errorHandler());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}

export default createApp;
