import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import multer from '@koa/multer';
import helmet from 'koa-helmet';
import cors from '@koa/cors';
import conditional from 'koa-conditional-get';
import etag from 'koa-etag';
import serve from 'koa-static';
import sqlite3 from 'sqlite3';
import BoardController from './controllers/api/board-controller';
import ThreadController from './controllers/api/thread-controller';
import PostController from './controllers/api/post-controller';
import Tokenizer from './markup/tokenizer';
import Parser from './markup/parser';
import auth from './middleware/auth';
import errorHandler from './middleware/error-handler';
import rewriteThumbnailUrls from './middleware/rewrite-thumbnails-url';
import BoardManager from './models/board-manager';
import { FileManager } from './models/file-manager';
import BoardRepository from './repositories/sqlite/board-repository';
import FileRepository from './repositories/sqlite/file-repository';
import PostAttributesRepository from './repositories/sqlite/post-attributes-repository';
import PostRepository from './repositories/sqlite/post-repository';
import ThreadRepository from './repositories/sqlite/thread-repository';
import { WakabaTripcodeGenerator } from './wakaba-tripcode-generator';
import { Thumbnailer } from './thumbnailer';
import FileController from './controllers/api/file-controller';
import IQueue from './models/queue';

const MS_IN_WEEK = 1000 * 60 * 60 * 24 * 7;

export function createApp(db: sqlite3.Database, queue: IQueue) {
  const boardRepository = new BoardRepository(db);
  const postAttributesRepository = new PostAttributesRepository(db);
  const threadRepository = new ThreadRepository(db, postAttributesRepository);
  const postRepository = new PostRepository(db, postAttributesRepository);
  const fileRepository = new FileRepository(db, postAttributesRepository);

  const thumbnailer = new Thumbnailer();
  const boardManager = new BoardManager();
  const fileManager = new FileManager(thumbnailer);
  const tripcodeGenerator = new WakabaTripcodeGenerator();
  const tokenizer = new Tokenizer();
  const parser = new Parser();

  const boardController = new BoardController(boardRepository, queue, boardManager);

  const threadController = new ThreadController(
    boardRepository,
    threadRepository,
    fileRepository,
    queue,
    tripcodeGenerator,
    tokenizer,
    parser,
    fileManager
  );

  const postController = new PostController(
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

  const fileController = new FileController(fileRepository, fileManager);

  const router = new Router();
  const upload = multer({ dest: 'tmp/' });

  router.get('/api/v1/boards/:slug/threads/:threadId/posts', upload.fields([]), postController.index);
  router.post(
    '/api/v1/boards/:slug/threads/:threadId/posts',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    postController.create
  );

  router.get('/api/v1/boards/:slug/threads/:threadId/posts/:id', upload.fields([]), postController.show);
  router.delete('/api/v1/boards/:slug/threads/:threadId/posts/:id', auth(), postController.delete);

  router.get('/api/v1/boards/:slug/threads', upload.fields([]), threadController.index);
  router.post('/api/v1/boards/:slug/threads', upload.fields([{ name: 'files', maxCount: 5 }]), threadController.create);
  router.get('/api/v1/boards/:slug/threads/:threadId', upload.fields([]), threadController.show);
  router.delete('/api/v1/boards/:slug/threads/:threadId', auth(), threadController.delete);

  router.get('/api/v1/boards/:slug/posts', upload.fields([]), postController.index);
  router.post('/api/v1/boards/:slug/posts', upload.fields([{ name: 'files', maxCount: 5 }]), postController.create);
  router.get('/api/v1/boards/:slug/posts/:id', upload.fields([]), postController.show);
  router.delete('/api/v1/boards/:slug/posts/:id', auth(), postController.delete);

  router.get('/api/v1/boards', upload.fields([]), boardController.index);
  router.post('/api/v1/boards', upload.fields([]), boardController.create);
  router.get('/api/v1/boards/:slug', upload.fields([]), boardController.show);
  router.put('/api/v1/boards/:slug', auth(), boardController.update);
  router.delete('/api/v1/boards/:slug', auth(), boardController.delete);

  router.get('/api/v1/threads/:threadId/posts', upload.fields([]), postController.index);
  router.post(
    '/api/v1/threads/:threadId/posts',
    upload.fields([{ name: 'files', maxCount: 5 }]),
    postController.create
  );

  router.get('/api/v1/threads/:threadId/posts/:id', upload.fields([]), postController.show);
  router.delete('/api/v1/threads/:threadId/posts/:id', auth(), postController.delete);

  router.get('/api/v1/threads', upload.fields([]), threadController.index);
  router.post('/api/v1/threads', upload.fields([{ name: 'files', maxCount: 5 }]), threadController.create);
  router.get('/api/v1/threads/:threadId', upload.fields([]), threadController.show);
  router.delete('/api/v1/threads/:threadId', auth(), threadController.delete);

  router.get('/api/v1/posts', upload.fields([]), postController.index);
  router.post('/api/v1/posts', upload.fields([{ name: 'files', maxCount: 5 }]), postController.create);
  router.get('/api/v1/posts/:id', upload.fields([]), postController.show);
  router.delete('/api/v1/posts/:id', auth(), postController.delete);

  router.get('/api/v1/thumbnails/:hash', upload.fields([]), fileController.createThumbnail);

  const app = new Koa();
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
