import Application from 'koa';
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

test('create board', async () => {
  // Act
  const response = await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });

  // Assert
  expect(response.status).toEqual(201);
  expect(response.type).toEqual('application/json');
  expect(response.headers.location).toEqual('/api/v1/boards/a');
  expect(response.body).toEqual({
    item: {
      slug: 'a',
      title: 'Anime',
      post_count: 0,
      created_at: expect.any(String),
    },
  });
});

test('get boards', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/boards');

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    items: [
      {
        slug: 'd',
        title: 'Development',
        post_count: 0,
        created_at: expect.any(String),
      },
      {
        slug: 'a',
        title: 'Anime',
        post_count: 0,
        created_at: expect.any(String),
      },
    ],
  });
});

test('get board', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/boards/d');

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    item: {
      slug: 'd',
      title: 'Development',
      post_count: 0,
      created_at: expect.any(String),
    },
  });
});

test('get missing board', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/boards/c');

  // Assert
  expect(response.status).toEqual(404);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 404,
    field: 'slug',
    message: 'not_found',
  });
});

test('update board', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback())
    .put('/api/v1/boards/d')
    .set('Authorization', `Bearer ${config.auth.token}`)
    .send({ slug: 'c', title: 'Coding' });

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    item: {
      slug: 'c',
      title: 'Coding',
      post_count: 0,
      created_at: expect.any(String),
    },
  });
});

test('update board without auth', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback()).put('/api/v1/boards/d').send({ slug: 'c', title: 'Coding' });

  // Assert
  expect(response.status).toEqual(401);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 401,
    message: 'not_authenticated',
  });
});

test('update missing board', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback())
    .put('/api/v1/boards/c')
    .set('Authorization', `Bearer ${config.auth.token}`)
    .send({ slug: 'c', title: 'Coding' });

  // Assert
  expect(response.status).toEqual(404);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 404,
    field: 'slug',
    message: 'not_found',
  });
});

test('delete board', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback())
    .delete('/api/v1/boards/d')
    .set('Authorization', `Bearer ${config.auth.token}`);

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    item: {
      slug: 'd',
      title: 'Development',
      post_count: 0,
      created_at: expect.any(String),
    },
  });
});

test('delete board without auth', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback()).delete('/api/v1/boards/d');

  // Assert
  expect(response.status).toEqual(401);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 401,
    message: 'not_authenticated',
  });
});

test('delete missing board', async () => {
  // Arrange
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app?.callback()).post('/api/v1/boards').send({ slug: 'd', title: 'Development' });

  // Act
  const response = await request(app?.callback())
    .delete('/api/v1/boards/c')
    .set('Authorization', `Bearer ${config.auth.token}`);

  // Assert
  expect(response.status).toEqual(404);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 404,
    field: 'slug',
    message: 'not_found',
  });
});
