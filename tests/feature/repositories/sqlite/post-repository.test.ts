import sqlite3 from 'sqlite3';
import Board from '../../../../src/models/board';
import Post from '../../../../src/models/post';
import IPostRepository from '../../../../src/models/post-repository';
import Thread from '../../../../src/models/thread';
import IThreadRepository from '../../../../src/models/thread-repository';
import SqliteBoardRepository from '../../../../src/repositories/sqlite/board-repository';
import { setupDatabase } from '../../../../src/repositories/sqlite/installer';
import SqlitePostAttributesRepository from '../../../../src/repositories/sqlite/post-attributes-repository';
import SqlitePostRepository from '../../../../src/repositories/sqlite/post-repository';
import SqliteThreadRepository from '../../../../src/repositories/sqlite/thread-repository';

let db: sqlite3.Database | null = null;

beforeEach(() => {
  db = new sqlite3.Database(':memory:', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
  setupDatabase(db);
});

afterEach(() => {
  db?.close();
});

async function addThread(repository: IThreadRepository, board: Board): Promise<Thread> {
  return (await repository.add(
    board!.id,
    'Subject',
    'Name',
    'Tripcode',
    'Message',
    [{ type: 'text', text: 'Message' }],
    '127.0.0.1'
  ))!;
}

async function addPost(repository: IPostRepository, board: Board, thread: Thread): Promise<Post> {
  return (await repository.add(
    board!.id,
    thread!.id,
    'Name',
    'Tripcode',
    'Message',
    [{ type: 'text', text: 'Message' }],
    '127.0.0.1'
  ))!;
}

function getExpectedPostData(post: Post | Thread) {
  return {
    id: post.id,
    board: {
      id: post.board.id,
      slug: post.board.slug,
      title: post.board.title,
      createdAt: expect.any(Date),
      postCount: 0,
    },
    parentId: post instanceof Post ? post.parentId : 0,
    name: post.name,
    tripcode: post.tripcode,
    message: post.message,
    parsedMessage: post.parsedMessage,
    ip: post.ip,
    createdAt: expect.any(Date),
    files: [],
  };
}

test('add', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, board!);

  const postRepository = new SqlitePostRepository(db!, postAttributesRepository);

  // Act
  const post = await addPost(postRepository, board!, thread);

  // Assert
  const posts = await postRepository.browse();
  expect(posts).toEqual([getExpectedPostData(thread), getExpectedPostData(post)]);
});

test('delete', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, board!);

  const postRepository = new SqlitePostRepository(db!, postAttributesRepository);
  const post = await addPost(postRepository, board!, thread);

  // Act
  const result = await postRepository.delete(post.id);

  // Assert
  expect(result).toEqual(getExpectedPostData(post));

  const posts = await postRepository.browse();
  expect(posts).toEqual([getExpectedPostData(thread)]);
});

test('browse', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread1 = await addThread(threadRepository, board!);
  const thread2 = await addThread(threadRepository, board!);

  const postRepository = new SqlitePostRepository(db!, postAttributesRepository);
  const post1 = await addPost(postRepository, board!, thread1);
  const post2 = await addPost(postRepository, board!, thread2);

  // Act
  const posts = await postRepository.browse();

  // Assert
  expect(posts).toEqual([
    getExpectedPostData(thread1),
    getExpectedPostData(thread2),
    getExpectedPostData(post1),
    getExpectedPostData(post2),
  ]);
});

test('browse for thread', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread1 = await addThread(threadRepository, board!);
  const thread2 = await addThread(threadRepository, board!);

  const postRepository = new SqlitePostRepository(db!, postAttributesRepository);
  const post1 = await addPost(postRepository, board!, thread1);
  await addPost(postRepository, board!, thread2);

  // Act
  const posts = await postRepository.browseForThread(thread1.id);

  // Assert
  expect(posts).toEqual([getExpectedPostData(thread1), getExpectedPostData(post1)]);
});

test('read', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, board!);

  const postRepository = new SqlitePostRepository(db!, postAttributesRepository);
  const post = await addPost(postRepository, board!, thread);
  await addPost(postRepository, board!, thread);

  // Act
  const posts = await postRepository.read(post.id);

  // Assert
  expect(posts).toEqual(getExpectedPostData(post));
});
