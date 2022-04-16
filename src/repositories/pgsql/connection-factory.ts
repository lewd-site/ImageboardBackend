import { Pool, PoolClient } from 'pg';
import config from '../../config';
import { IAsyncFactory } from '../../models/factory';
import { setupDatabase } from './setup-database';

export class PgsqlConnectionFactory implements IAsyncFactory<PoolClient> {
  protected readonly pool: Pool;

  public constructor() {
    this.pool = new Pool({
      host: config.pgsql.host,
      port: config.pgsql.port,
      database: config.pgsql.database,
      user: config.pgsql.user,
      password: config.pgsql.password,
    });

    this.setupDatabase();
  }

  private async setupDatabase() {
    const client = await this.create();
    await setupDatabase(client);
  }

  public create() {
    return this.pool.connect();
  }
}

export default PgsqlConnectionFactory;
