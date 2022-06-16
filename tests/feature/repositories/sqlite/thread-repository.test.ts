import sqlite3 from 'sqlite3';
import Board from '../../../../src/models/board';
import Thread from '../../../../src/models/thread';
import IThreadRepository from '../../../../src/models/thread-repository';
import SqliteBoardRepository from '../../../../src/repositories/sqlite/board-repository';
import setupDatabase from '../../../../src/repositories/sqlite/setup-database';
import SqlitePostAttributesRepository from '../../../../src/repositories/sqlite/post-attributes-repository';
import SqliteThreadRepository from '../../../../src/repositories/sqlite/thread-repository';
import { delay } from '../../../../src/utils';

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

function getExpectedThreadData(thread: Thread) {
  return {
    id: thread.id,
    board: {
      id: thread.board.id,
      slug: thread.board.slug,
      title: thread.board.title,
      createdAt: expect.any(Date),
      postCount: 0,
    },
    subject: thread.subject,
    name: thread.name,
    tripcode: thread.tripcode,
    message: thread.message,
    parsedMessage: thread.parsedMessage,
    ip: thread.ip,
    postCount: 1,
    replies: [],
    createdAt: expect.any(Date),
    bumpedAt: expect.any(Date),
    files: [],
  };
}

test('add', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);

  // Act
  const thread = await addThread(threadRepository, board!);

  // Assert
  const threads = await threadRepository.browse();
  expect(threads).toEqual([getExpectedThreadData(thread)]);
});

test('delete', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, board!);

  // Act
  const result = await threadRepository.delete(thread.id);

  // Assert
  expect(result).toEqual(getExpectedThreadData(thread));

  const threads = await threadRepository.browse();
  expect(threads).toEqual([]);
});

test('increment post count', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, board!);

  // Act
  await threadRepository.incrementPostCount(thread.id);

  // Assert
  const threads = await threadRepository.browse();
  expect(threads[0].postCount).toEqual(thread.postCount + 1);
});

test('bump thread', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, board!);

  // Act
  await delay(1000);
  await threadRepository.bumpThread(thread.id);

  // Assert
  const threads = await threadRepository.browse();
  expect(threads[0].bumpedAt.getTime()).toBeGreaterThan(thread!.bumpedAt.getTime());
});

test('browse', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const board = await boardRepository.add('a', 'Anime');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread1 = await addThread(threadRepository, board!);
  const thread2 = await addThread(threadRepository, board!);

  // Act
  const threads = await threadRepository.browse();

  // Assert
  expect(threads).toEqual([getExpectedThreadData(thread2), getExpectedThreadData(thread1)]);
});

test('browse for board', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const boardA = await boardRepository.add('a', 'Anime');
  const boardB = await boardRepository.add('b', 'Random');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, boardA!);
  await addThread(threadRepository, boardB!);

  // Act
  const threads = await threadRepository.browseForBoard(boardA!.id);

  // Assert
  expect(threads).toEqual([getExpectedThreadData(thread)]);
});

test('read', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const boardA = await boardRepository.add('a', 'Anime');
  const boardB = await boardRepository.add('b', 'Random');

  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const threadRepository = new SqliteThreadRepository(db!, postAttributesRepository);
  const thread = await addThread(threadRepository, boardA!);
  await addThread(threadRepository, boardB!);

  // Act
  const threads = await threadRepository.read(thread.id);

  // Assert
  expect(threads).toEqual(getExpectedThreadData(thread));
});
