import Application from 'koa';
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

  app = createApp(container);
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
