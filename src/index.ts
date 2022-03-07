import * as http from 'http';
import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';
import * as sqlite3 from 'sqlite3';
import config from './config';
import BoardController from './controllers/api/board-controller';
import BoardThreadController from './controllers/api/board-thread-controller';
import BoardThreadPostController from './controllers/api/board-thread-post-controller';
import PostController from './controllers/api/post-controller';
import ThreadController from './controllers/api/thread-controller';
import ThreadPostController from './controllers/api/thread-post-controller';
import { auth } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import BoardManager from './models/board-manager';
import BoardRepository from './repositories/sqlite/board-repository';
import { setupDatabase } from './repositories/sqlite/installer';
import PostRepository from './repositories/sqlite/post-repository';
import ThreadRepository from './repositories/sqlite/thread-repository';

const db = new sqlite3.Database(config.db.path, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
setupDatabase(db);

const boardRepository = new BoardRepository(db);
const threadRepository = new ThreadRepository(db);
const postRepository = new PostRepository(db);

const boardManager = new BoardManager();

const boardController = new BoardController(boardRepository, boardManager);
const boardThreadController = new BoardThreadController(boardRepository, threadRepository);
const boardThreadPostController = new BoardThreadPostController(boardRepository, threadRepository, postRepository);
const threadController = new ThreadController(boardRepository, threadRepository);
const threadPostController = new ThreadPostController(boardRepository, threadRepository, postRepository);
const postController = new PostController(boardRepository, threadRepository, postRepository);

const router = new Router();
router.get('/api/v1/boards', boardController.index);
router.post('/api/v1/boards', boardController.create);
router.get('/api/v1/boards/:slug', boardController.show);
router.put('/api/v1/boards/:slug', auth(), boardController.update);
router.delete('/api/v1/boards/:slug', auth(), boardController.delete);

router.get('/api/v1/boards/:slug/threads', boardThreadController.index);
router.post('/api/v1/boards/:slug/threads', boardThreadController.create);
router.get('/api/v1/boards/:slug/threads/:threadId', boardThreadController.show);
router.delete('/api/v1/boards/:slug/threads/:threadId', auth(), boardThreadController.delete);

router.get('/api/v1/boards/:slug/threads/:threadId/posts', boardThreadPostController.index);
router.post('/api/v1/boards/:slug/threads/:threadId/posts', boardThreadPostController.create);
router.get('/api/v1/boards/:slug/threads/:threadId/posts/:id', boardThreadPostController.show);
router.delete('/api/v1/boards/:slug/threads/:threadId/posts/:id', auth(), boardThreadPostController.delete);

router.get('/api/v1/threads', threadController.index);
router.post('/api/v1/threads', threadController.create);
router.get('/api/v1/threads/:threadId', threadController.show);
router.delete('/api/v1/threads/:threadId', auth(), threadController.delete);

router.get('/api/v1/threads/:threadId/posts', threadPostController.index);
router.post('/api/v1/threads/:threadId/posts', threadPostController.create);
router.get('/api/v1/threads/:threadId/posts/:id', threadPostController.show);
router.delete('/api/v1/threads/:threadId/posts/:id', auth(), threadPostController.delete);

router.get('/api/v1/posts', postController.index);
router.post('/api/v1/posts', postController.create);
router.get('/api/v1/posts/:id', postController.show);
router.delete('/api/v1/posts/:id', postController.delete);

const app = new Koa();
app.use(errorHandler());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

http.createServer(app.callback()).listen(config.http.port);
