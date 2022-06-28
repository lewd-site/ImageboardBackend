import sqlite3 from 'sqlite3';

export abstract class SqliteRepository {
  protected static readonly MS_IN_SECOND = 1000;

  public constructor(protected readonly db: sqlite3.Database) {}

  public async begin(): Promise<void> {
    await this.runAsync('BEGIN');
  }

  public async commit(): Promise<void> {
    await this.runAsync('COMMIT');
  }

  public async rollback(): Promise<void> {
    await this.runAsync('ROLLBACK');
  }

  protected async runAsync(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err !== null) {
          return reject(err);
        }

        resolve(this);
      });
    });
  }

  protected async getAsync(sql: string, params: any[] = []): Promise<{ statement: sqlite3.Statement; row: any }> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, function (err, row) {
        if (err !== null) {
          return reject(err);
        }

        if (typeof row === 'undefined') {
          return resolve({ statement: this, row: null });
        }

        resolve({ statement: this, row });
      });
    });
  }

  protected async allAsync(sql: string, params: any[] = []): Promise<{ statement: sqlite3.Statement; rows: any[] }> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, function (err, rows) {
        if (err !== null) {
          return reject(err);
        }

        resolve({ statement: this, rows });
      });
    });
  }
}

export default SqliteRepository;
