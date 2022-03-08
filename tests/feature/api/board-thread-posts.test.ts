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

test('create post', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });

  // Act
  const response = await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  // Assert
  expect(response.status).toEqual(201);
  expect(response.type).toEqual('application/json');
  expect(response.headers.location).toEqual('/api/v1/boards/a/threads/1/posts/2');
  expect(response.body).toEqual({
    item: {
      id: 2,
      slug: 'a',
      parent_id: 1,
      name: 'Tester',
      tripcode: null,
      message: 'Test reply 1',
      created_at: expect.any(String),
    },
  });
});

test('get posts', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app.callback()).get('/api/v1/boards/a/threads/1/posts');

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    items: [
      {
        id: 1,
        slug: 'a',
        parent_id: 0,
        name: 'Tester',
        tripcode: null,
        message: 'Test thread 1',
        created_at: expect.any(String),
      },
      {
        id: 2,
        slug: 'a',
        parent_id: 1,
        name: 'Tester',
        tripcode: null,
        message: 'Test reply 1',
        created_at: expect.any(String),
      },
      {
        id: 3,
        slug: 'a',
        parent_id: 1,
        name: 'Tester',
        tripcode: null,
        message: 'Test reply 2',
        created_at: expect.any(String),
      },
    ],
  });
});

test('get post', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app.callback()).get('/api/v1/boards/a/threads/1/posts/3');

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    item: {
      id: 3,
      slug: 'a',
      parent_id: 1,
      name: 'Tester',
      tripcode: null,
      message: 'Test reply 2',
      created_at: expect.any(String),
    },
  });
});

test('get missing post', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app.callback()).get('/api/v1/boards/a/threads/1/posts/4');

  // Assert
  expect(response.status).toEqual(404);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 404,
    field: 'id',
    message: 'not_found',
  });
});

test('delete post', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app.callback())
    .delete('/api/v1/boards/a/threads/1/posts/3')
    .set('Authorization', `Bearer ${config.auth.token}`);

  // Assert
  expect(response.status).toEqual(200);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    item: {
      id: 3,
      slug: 'a',
      parent_id: 1,
      name: 'Tester',
      tripcode: null,
      message: 'Test reply 2',
      created_at: expect.any(String),
    },
  });
});

test('delete post without auth', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app.callback()).delete('/api/v1/boards/a/threads/1/posts/3');

  // Assert
  expect(response.status).toEqual(401);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 401,
    message: 'not_authenticated',
  });
});

test('delete missing post', async () => {
  // Arrange
  const app = createApp(db!);
  await request(app.callback()).post('/api/v1/boards').send({ slug: 'a', title: 'Anime' });
  await request(app.callback()).post('/api/v1/boards/a/threads').send({ name: 'Tester', message: 'Test thread 1' });
  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app.callback())
    .delete('/api/v1/boards/a/threads/1/posts/4')
    .set('Authorization', `Bearer ${config.auth.token}`);

  // Assert
  expect(response.status).toEqual(404);
  expect(response.type).toEqual('application/json');
  expect(response.body).toEqual({
    status: 404,
    field: 'id',
    message: 'not_found',
  });
});
