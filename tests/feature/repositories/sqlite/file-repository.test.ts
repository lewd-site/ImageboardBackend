import sqlite3 from 'sqlite3';
import File from '../../../../src/models/file';
import SqliteFileRepository from '../../../../src/repositories/sqlite/file-repository';
import setupDatabase from '../../../../src/repositories/sqlite/setup-database';
import SqlitePostAttributesRepository from '../../../../src/repositories/sqlite/post-attributes-repository';

let db: sqlite3.Database | null = null;

beforeEach(() => {
  db = new sqlite3.Database(':memory:', sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
  setupDatabase(db);
});

afterEach(() => {
  db?.close();
});

async function addFile(repository: SqliteFileRepository, hash: string): Promise<File> {
  return (await repository.readOrAdd(hash, 'Name', 'jpg', 'image/jpeg', 100, 100, 100, null, '127.0.0.1'))!;
}

function getExpectedFileData(file: File) {
  return {
    id: file.id,
    hash: file.hash,
    name: file.name,
    extension: file.extension,
    type: file.type,
    size: file.size,
    width: file.width,
    height: file.height,
    length: file.length,
    ip: file.ip,
    createdAt: expect.any(Date),
  };
}

test('add', async () => {
  // Arrange
  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const fileRepository = new SqliteFileRepository(db!, postAttributesRepository);

  // Act
  const file = await addFile(fileRepository, 'hash');

  // Assert
  const expectedFile = await fileRepository.read(file.id);
  expect(file).toEqual(getExpectedFileData(expectedFile!));
});

test('add with existing hash', async () => {
  // Arrange
  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const fileRepository = new SqliteFileRepository(db!, postAttributesRepository);
  const file1 = await addFile(fileRepository, 'hash');

  // Act
  const file2 = await addFile(fileRepository, 'hash');

  // Assert
  expect(file2).toEqual(getExpectedFileData(file1));
});

test('delete', async () => {
  // Arrange
  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const fileRepository = new SqliteFileRepository(db!, postAttributesRepository);
  const file = await addFile(fileRepository, 'hash 1');

  // Act
  const result = await fileRepository.delete(file.id);

  // Assert
  expect(result).toEqual(getExpectedFileData(file));

  const readResult = await fileRepository.read(file.id);
  expect(readResult).toBeNull();
});

test('read', async () => {
  // Arrange
  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const fileRepository = new SqliteFileRepository(db!, postAttributesRepository);
  const expectedFile = await addFile(fileRepository, 'hash');

  // Act
  const file = await fileRepository.read(expectedFile.id);

  // Assert
  expect(file).toEqual(getExpectedFileData(expectedFile));
});

test('read by hash', async () => {
  // Arrange
  const postAttributesRepository = new SqlitePostAttributesRepository(db!);
  const fileRepository = new SqliteFileRepository(db!, postAttributesRepository);
  const expectedFile = await addFile(fileRepository, 'hash');

  // Act
  const file = await fileRepository.readByHash(expectedFile.hash);

  // Assert
  expect(file).toEqual(getExpectedFileData(expectedFile));
});
