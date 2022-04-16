import { ClientBase } from 'pg';

export abstract class PgsqlRepository {
  public constructor(protected readonly client: ClientBase) {}

  public async begin(): Promise<void> {
    await this.client.query('BEGIN');
  }

  public async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }

  public async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }
}

export default PgsqlRepository;
