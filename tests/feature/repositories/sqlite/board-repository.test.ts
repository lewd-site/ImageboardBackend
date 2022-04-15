import sqlite3 from 'sqlite3';
import Board from '../../../../src/models/board';
import SqliteBoardRepository from '../../../../src/repositories/sqlite/board-repository';
import setupDatabase from '../../../../src/repositories/sqlite/setup-database';

let db: sqlite3.Database | null = null;

beforeEach(() => {
  db = new sqlite3.Database(':memory:', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
  setupDatabase(db);
});

afterEach(() => {
  db?.close();
});

function getExpectedBoardData(board: Board) {
  return {
    id: board.id,
    slug: board.slug,
    title: board.title,
    createdAt: expect.any(Date),
    postCount: 0,
  };
}

test('add', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);

  // Act
  const boardA = await boardRepository.add('a', 'Anime');

  // Assert
  const boards = await boardRepository.browse();
  expect(boards).toEqual([getExpectedBoardData(boardA!)]);
});

test('edit', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const boardA = await boardRepository.add('a', 'Anime');
  const boardB = await boardRepository.add('b', 'Random');

  // Act
  const result = await boardRepository.edit(boardA!.id, 'c', 'Coding');

  // Assert
  expect(result).toEqual({
    ...getExpectedBoardData(boardA!),
    slug: 'c',
    title: 'Coding',
  });

  const boards = await boardRepository.browse();
  expect(boards).toEqual([
    getExpectedBoardData(boardB!),
    {
      ...getExpectedBoardData(boardA!),
      slug: 'c',
      title: 'Coding',
    },
  ]);
});

test('delete', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const boardA = await boardRepository.add('a', 'Anime');
  const boardB = await boardRepository.add('b', 'Random');

  // Act
  const result = await boardRepository.delete(boardA!.id);

  // Assert
  expect(result).toEqual(getExpectedBoardData(boardA!));

  const boards = await boardRepository.browse();
  expect(boards).toEqual([getExpectedBoardData(boardB!)]);
});

test('increment post count', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const boardA = await boardRepository.add('a', 'Anime');
  const boardB = await boardRepository.add('b', 'Random');

  // Act
  const result = await boardRepository.incrementPostCount(boardA!.id);

  // Assert
  expect(result).toEqual({
    ...getExpectedBoardData(boardA!),
    postCount: boardA!.postCount + 1,
  });

  const boards = await boardRepository.browse();
  expect(boards).toEqual([
    {
      ...getExpectedBoardData(boardA!),
      postCount: boardA!.postCount + 1,
    },
    getExpectedBoardData(boardB!),
  ]);
});

test('browse', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  const boardA = await boardRepository.add('a', 'Anime');
  const boardB = await boardRepository.add('b', 'Random');
  const boardC = await boardRepository.add('c', 'Coding');
  const boardD = await boardRepository.add('d', 'Development');

  // Act
  const boards = await boardRepository.browse();

  // Assert
  expect(boards).toEqual([
    getExpectedBoardData(boardD!),
    getExpectedBoardData(boardC!),
    getExpectedBoardData(boardB!),
    getExpectedBoardData(boardA!),
  ]);
});

test('read', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  await boardRepository.add('a', 'Anime');

  const expectedBoard = await boardRepository.add('b', 'Random');
  await boardRepository.add('c', 'Coding');
  await boardRepository.add('d', 'Development');

  // Act
  const board = await boardRepository.read(expectedBoard!.id);

  // Assert
  expect(board).toEqual(getExpectedBoardData(expectedBoard!));
});

test('read by slug', async () => {
  // Arrange
  const boardRepository = new SqliteBoardRepository(db!);
  await boardRepository.add('a', 'Anime');
  await boardRepository.add('b', 'Random');

  const expectedBoard = await boardRepository.add('c', 'Coding');
  await boardRepository.add('d', 'Development');

  // Act
  const board = await boardRepository.readBySlug(expectedBoard!.slug);

  // Assert
  expect(board).toEqual(getExpectedBoardData(expectedBoard!));
});
