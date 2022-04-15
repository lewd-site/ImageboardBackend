import sqlite3 from 'sqlite3';
import IRepositoryFactory from '../../models/repository-factory';
import SqliteBoardRepository from './board-repository';
import SqliteFileRepository from './file-repository';
import SqlitePostAttributesRepository from './post-attributes-repository';
import SqlitePostRepository from './post-repository';
import SqliteThreadRepository from './thread-repository';

export class SqliteRepositoryFactory implements IRepositoryFactory {
  public constructor(protected readonly db: sqlite3.Database) {}

  public createBoardRepository() {
    return new SqliteBoardRepository(this.db);
  }

  public createThreadRepository() {
    const postAttributesRepository = this.createPostAttributesRepository();

    return new SqliteThreadRepository(this.db, postAttributesRepository);
  }

  public createPostRepository() {
    const postAttributesRepository = this.createPostAttributesRepository();

    return new SqlitePostRepository(this.db, postAttributesRepository);
  }

  public createFileRepository() {
    const postAttributesRepository = this.createPostAttributesRepository();

    return new SqliteFileRepository(this.db, postAttributesRepository);
  }

  protected createPostAttributesRepository() {
    return new SqlitePostAttributesRepository(this.db);
  }
}

export default SqliteRepositoryFactory;
