import http from 'http';
import sqlite3 from 'sqlite3';
import { createApp } from './app';
import config from './config';
import { setupDatabase } from './repositories/sqlite/installer';

const db = new sqlite3.Database(config.db.path, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
setupDatabase(db);

const app = createApp(db);
http.createServer(app.callback()).listen(config.http.port);
