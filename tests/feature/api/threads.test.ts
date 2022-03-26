import Application from 'koa';
import path from 'path';
import sqlite3 from 'sqlite3';
import request from 'supertest';
import { createApp } from '../../../src/app';
import config from '../../../src/config';
import IQueue from '../../../src/models/queue';
import DummyQueue from '../../../src/queues/dummy';
import { setupDatabase } from '../../../src/repositories/sqlite/installer';

let db: sqlite3.Database | null = null;
let queue: IQueue | null = null;
let app: Application | null = null;

beforeEach(() => {
  db = new sqlite3.Database(':memory:', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
  setupDatabase(db);

  queue = new DummyQueue();
  queue.connect();

  app = createApp(db, queue);
});

afterEach(() => {
  db?.close();
  queue?.disconnect();
});

test('create thread', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });

  // Act
  const response = await request(app?.callback())
    .post('/api/v1/threads')
    .field('slug', 'a')
    .field('name', 'Tester')
    .field('message', 'Hello world!')
    .attach('files', path.resolve(__dirname, '..', '..', 'data', 'test.jpg'));

  // Assert
  expect(response.status).toEqual(201);
  expect(response.type).toEqual('application/json');
  expect(response.headers.location).toEqual('/api/v1/boards/a/threads/1');
  expect(response.body).toEqual({
    item: {
      id: 1,
      slug: 'a',
      subject: null,
      name: 'Tester',
      tripcode: null,
      message: 'Hello world!',
      message_parsed: [{ type: 'text', text: 'Hello world!' }],
      files: [
        {
          hash: '0543ea6b3b10944ac126bfdc4e387c4e',
          name: 'test.jpg',
          extension: 'jpg',
          path: 'original/0543ea6b3b10944ac126bfdc4e387c4e.jpg',
          type: 'image/jpeg',
          size: 162928,
          width: 600,
          height: 900,
          length: null,
          created_at: expect.any(String),
        },
      ],
      post_count: 1,
      created_at: expect.any(String),
      bumped_at: expect.any(String),
    },
  });
});

test('get threads', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 1' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/threads');

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    items: [
      {
        id: 2,
        slug: 'a',
        subject: null,
        name: 'Tester',
        tripcode: null,
        message: 'Test thread 2',
        message_parsed: [{ type: 'text', text: 'Test thread 2' }],
        files: [],
        post_count: 1,
        created_at: expect.any(String),
        bumped_at: expect.any(String),
      },
      {
        id: 1,
        slug: 'a',
        subject: null,
        name: 'Tester',
        tripcode: null,
        message: 'Test thread 1',
        message_parsed: [{ type: 'text', text: 'Test thread 1' }],
        files: [],
        post_count: 1,
        created_at: expect.any(String),
        bumped_at: expect.any(String),
      },
    ],
  });
});

test('get thread', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 1' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/threads/2');

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    item: {
      id: 2,
      slug: 'a',
      subject: null,
      name: 'Tester',
      tripcode: null,
      message: 'Test thread 2',
      message_parsed: [{ type: 'text', text: 'Test thread 2' }],
      files: [],
      post_count: 1,
      created_at: expect.any(String),
      bumped_at: expect.any(String),
    },
  });
});

test('get missing thread', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 1' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/threads/3');

  // Assert
  expect(response.status).toEqual(404);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 404,
    field: 'threadId',
    message: 'not_found',
  });
});

test('delete thread', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 1' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app?.callback())
    .delete('/api/v1/threads/2')
    .set('Authorization', `Bearer ${config.auth.token}`);

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    item: {
      id: 2,
      slug: 'a',
      subject: null,
      name: 'Tester',
      tripcode: null,
      message: 'Test thread 2',
      message_parsed: [{ type: 'text', text: 'Test thread 2' }],
      files: [],
      post_count: 1,
      created_at: expect.any(String),
      bumped_at: expect.any(String),
    },
  });
});

test('delete thread without auth', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 1' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app?.callback()).delete('/api/v1/threads/2');

  // Assert
  expect(response.status).toEqual(401);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 401,
    message: 'not_authenticated',
  });
});

test('delete missing thread', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 1' });
  await request(app?.callback()).post('/api/v1/threads').send({ slug: 'a', name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app?.callback())
    .delete('/api/v1/threads/3')
    .set('Authorization', `Bearer ${config.auth.token}`);

  // Assert
  expect(response.status).toEqual(404);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 404,
    field: 'threadId',
    message: 'not_found',
  });
});
