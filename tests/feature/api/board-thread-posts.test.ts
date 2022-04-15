import Application from 'koa';
import path from 'path';
import request from 'supertest';
import createApp from '../../../src/app';
import config from '../../../src/config';
import Container from '../../../src/container';
import SqliteConnectionFactory from '../../../src/repositories/sqlite/connection-factory';
import registerServices, { CONNECTION_FACTORY } from '../../../src/services';

let app: Application | null = null;

beforeEach(() => {
  config.db = 'sqlite';
  config.sqlite.path = ':memory:';
  config.queue = 'dummy';

  const container = new Container();
  registerServices(container);
  container.registerFactory(CONNECTION_FACTORY, { create: async () => new SqliteConnectionFactory(true) });

  app = createApp(container, false);
});

async function createBoard(slug: string, title: string): Promise<void> {
  await request(app?.callback()).post('/api/v1/boards').send({ slug, title });
}

async function createThread(name: string, message: string): Promise<void> {
  await request(app?.callback())
    .post('/api/v1/boards/a/threads')
    .field('name', name)
    .field('message', message)
    .attach('files', path.resolve(__dirname, '..', '..', 'data', 'test.jpg'));
}

test('create post', async () => {
  // Arrange
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  // Act
  const response = await request(app?.callback())
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
      message_parsed: [{ type: 'text', text: 'Test reply 1' }],
      files: [],
      created_at: expect.any(String),
    },
  });
});

test('create post with file', async () => {
  // Arrange
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  // Act
  const response = await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .field('name', 'Tester')
    .field('message', 'Test reply 1')
    .attach('files', path.resolve(__dirname, '..', '..', 'data', 'test.jpg'));

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
      message_parsed: [{ type: 'text', text: 'Test reply 1' }],
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
      created_at: expect.any(String),
    },
  });
});

test('get posts', async () => {
  // Arrange
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/boards/a/threads/1/posts');

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
        message_parsed: [{ type: 'text', text: 'Test thread 1' }],
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
        created_at: expect.any(String),
      },
      {
        id: 2,
        slug: 'a',
        parent_id: 1,
        name: 'Tester',
        tripcode: null,
        message: 'Test reply 1',
        message_parsed: [{ type: 'text', text: 'Test reply 1' }],
        files: [],
        created_at: expect.any(String),
      },
      {
        id: 3,
        slug: 'a',
        parent_id: 1,
        name: 'Tester',
        tripcode: null,
        message: 'Test reply 2',
        message_parsed: [{ type: 'text', text: 'Test reply 2' }],
        files: [],
        created_at: expect.any(String),
      },
    ],
  });
});

test('get post', async () => {
  // Arrange
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/boards/a/threads/1/posts/3');

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
      message_parsed: [{ type: 'text', text: 'Test reply 2' }],
      files: [],
      created_at: expect.any(String),
    },
  });
});

test('get missing post', async () => {
  // Arrange
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app?.callback()).get('/api/v1/boards/a/threads/1/posts/4');

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
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app?.callback())
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
      message_parsed: [{ type: 'text', text: 'Test reply 2' }],
      files: [],
      created_at: expect.any(String),
    },
  });
});

test('delete post without auth', async () => {
  // Arrange
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app?.callback()).delete('/api/v1/boards/a/threads/1/posts/3');

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
  await createBoard('a', 'Anime');
  await createThread('Tester', 'Test thread 1');

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 1' });

  await request(app?.callback())
    .post('/api/v1/boards/a/threads/1/posts')
    .send({ name: 'Tester', message: 'Test reply 2' });

  // Act
  const response = await request(app?.callback())
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
