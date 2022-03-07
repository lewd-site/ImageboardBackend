import * as http from 'http';
import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as Router from 'koa-router';
import * as sqlite3 from 'sqlite3';
import config from './config';
import BoardController from './controllers/api/board-controller';
import { auth } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import BoardManager from './models/board-manager';
import BoardRepository from './repositories/sqlite/board-repository';
import { setupDatabase } from './repositories/sqlite/installer';

const db = new sqlite3.Database(config.db.path, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
setupDatabase(db);

const boardRepository = new BoardRepository(db);
const boardManager = new BoardManager();
const boardController = new BoardController(boardRepository, boardManager);

const router = new Router();
router.get('/api/v1/boards', boardController.index);
router.post('/api/v1/boards', boardController.create);
router.get('/api/v1/boards/:slug', boardController.show);
router.put('/api/v1/boards/:slug', auth(), boardController.update);
router.delete('/api/v1/boards/:slug', auth(), boardController.delete);

const app = new Koa();
app.use(errorHandler());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

http.createServer(app.callback()).listen(config.http.port);
