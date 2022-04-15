import sqlite3 from 'sqlite3';
import config from '../../config';
import { IFactory } from '../../models/factory';
import setupDatabase from './setup-database';

export class SqliteConnectionFactory implements IFactory<sqlite3.Database> {
  protected _connection?: sqlite3.Database;

  public constructor(public readonly isSingleton: boolean = false) {
    this.setupDatabase();
  }

  private setupDatabase() {
    const connection = this.create();
    setupDatabase(connection);
  }

  public create() {
    if (typeof this._connection !== 'undefined') {
      return this._connection;
    }

    const connection = new sqlite3.Database(config.sqlite.path, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
    if (this.isSingleton) {
      this._connection = connection;
    }

    return connection;
  }
}

export default SqliteConnectionFactory;
