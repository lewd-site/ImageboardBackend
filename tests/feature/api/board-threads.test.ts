import sqlite3 from 'sqlite3';
import request from 'supertest';
import { createApp } from '../../../src/app';
import config from '../../../src/config';
import { setupDatabase } from '../../../src/repositories/sqlite/installer';

let db: sqlite3.Database | null = null;

beforeEach(() => {
  db = new sqlite3.Database(':memory:', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
  setupDatabase(db);
});

afterEach(() => {
  db?.close();
});

test('create thread', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });

  // Act
  const response = await request(app.callback())
    .post('/api/v1/boards/a/threads')
    .send({ name: 'Tester', message: 'Hello world!' });

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
      post_count: 1,
      created_at: expect.any(String),
      bumped_at: expect.any(String),
    },
  });
});

test('get threads', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app.callback()).get('/api/v1/boards/a/threads');

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
        post_count: 1,
        created_at: expect.any(String),
        bumped_at: expect.any(String),
      },
    ],
  });
});

test('get thread', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app.callback()).get('/api/v1/boards/a/threads/2');

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
      post_count: 1,
      created_at: expect.any(String),
      bumped_at: expect.any(String),
    },
  });
});

test('get missing thread', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app.callback()).get('/api/v1/boards/a/threads/3');

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
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app.callback())
    .delete('/api/v1/boards/a/threads/2')
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
      post_count: 1,
      created_at: expect.any(String),
      bumped_at: expect.any(String),
    },
  });
});

test('delete thread without auth', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app.callback()).delete('/api/v1/boards/a/threads/2');

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
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 2' });

  // Act
  const response = await request(app.callback())
    .delete('/api/v1/boards/a/threads/3')
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