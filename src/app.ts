import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import sqlite3 from 'sqlite3';
import BoardController from './controllers/api/board-controller';
import ThreadController from './controllers/api/thread-controller';
import PostController from './controllers/api/post-controller';
import { auth } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import BoardManager from './models/board-manager';
import BoardRepository from './repositories/sqlite/board-repository';
import PostAttributesRepository from './repositories/sqlite/post-attributes-repository';
import PostRepository from './repositories/sqlite/post-repository';
import ThreadRepository from './repositories/sqlite/thread-repository';
import { WakabaTripcodeGenerator } from './wakaba-tripcode-generator';

export function createApp(db: sqlite3.Database) {
  const boardRepository = new BoardRepository(db);
  const postAttributesRepository = new PostAttributesRepository(db);
  const threadRepository = new ThreadRepository(db, postAttributesRepository);
  const postRepository = new PostRepository(db, postAttributesRepository);

  const boardManager = new BoardManager();
  const tripcodeGenerator = new WakabaTripcodeGenerator();

  const boardController = new BoardController(boardRepository, boardManager);
  const threadController = new ThreadController(boardRepository, threadRepository, tripcodeGenerator);
  const postController = new PostController(boardRepository, threadRepository, postRepository, tripcodeGenerator);

  const router = new Router();

  router.get('/api/v1/boards/:slug/threads/:threadId/posts', postController.index);
  router.post('/api/v1/boards/:slug/threads/:threadId/posts', postController.create);
  router.get('/api/v1/boards/:slug/threads/:threadId/posts/:id', postController.show);
  router.delete('/api/v1/boards/:slug/threads/:threadId/posts/:id', auth(), postController.delete);

  router.get('/api/v1/boards/:slug/threads', threadController.index);
  router.post('/api/v1/boards/:slug/threads', threadController.create);
  router.get('/api/v1/boards/:slug/threads/:threadId', threadController.show);
  router.delete('/api/v1/boards/:slug/threads/:threadId', auth(), threadController.delete);

  router.get('/api/v1/boards/:slug/posts', postController.index);
  router.post('/api/v1/boards/:slug/posts', postController.create);
  router.get('/api/v1/boards/:slug/posts/:id', postController.show);
  router.delete('/api/v1/boards/:slug/posts/:id', auth(), postController.delete);

  router.get('/api/v1/boards', boardController.index);
  router.post('/api/v1/boards', boardController.create);
  router.get('/api/v1/boards/:slug', boardController.show);
  router.put('/api/v1/boards/:slug', auth(), boardController.update);
  router.delete('/api/v1/boards/:slug', auth(), boardController.delete);

  router.get('/api/v1/threads/:threadId/posts', postController.index);
  router.post('/api/v1/threads/:threadId/posts', postController.create);
  router.get('/api/v1/threads/:threadId/posts/:id', postController.show);
  router.delete('/api/v1/threads/:threadId/posts/:id', auth(), postController.delete);

  router.get('/api/v1/threads', threadController.index);
  router.post('/api/v1/threads', threadController.create);
  router.get('/api/v1/threads/:threadId', threadController.show);
  router.delete('/api/v1/threads/:threadId', auth(), threadController.delete);

  router.get('/api/v1/posts', postController.index);
  router.post('/api/v1/posts', postController.create);
  router.get('/api/v1/posts/:id', postController.show);
  router.delete('/api/v1/posts/:id', auth(), postController.delete);

  const app = new Koa();
  app.use(errorHandler());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
