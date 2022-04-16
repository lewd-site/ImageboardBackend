import PgsqlRepository from './repository';

export class PgsqlPostAttributesRepository extends PgsqlRepository {
  public async readOrAddName(name: string): Promise<number> {
    const id = await this.readName(name);
    if (id === null) {
      return this.addName(name);
    }

    return id;
  }

  protected async readName(name: string): Promise<number | null> {
    const result = await this.client.query(`SELECT id FROM names WHERE name = $1`, [name]);
    if (result.rowCount === 0) {
      return null;
    }

    return +result.rows[0].id;
  }

  protected async addName(name: string): Promise<number> {
    const result = await this.client.query(`INSERT INTO names (name) VALUES ($1) RETURNING id`, [name]);
    return +result.rows[0].id;
  }

  public async readOrAddTripcode(tripcode: string): Promise<number> {
    const id = await this.readTripcode(tripcode);
    if (id === null) {
      return this.addTripcode(tripcode);
    }

    return id;
  }

  protected async readTripcode(tripcode: string): Promise<number | null> {
    const result = await this.client.query(`SELECT id FROM tripcodes WHERE tripcode = $1`, [tripcode]);
    if (result.rowCount === 0) {
      return null;
    }

    return +result.rows[0].id;
  }

  protected async addTripcode(tripcode: string): Promise<number> {
    const result = await this.client.query(`INSERT INTO tripcodes (tripcode) VALUES ($1) RETURNING id`, [tripcode]);
    return +result.rows[0].id;
  }

  public async readOrAddIp(ip: string): Promise<number> {
    const id = await this.readIp(ip);
    if (id === null) {
      return this.addIp(ip);
    }

    return id;
  }

  protected async readIp(ip: string): Promise<number | null> {
    const result = await this.client.query(`SELECT id FROM ips WHERE ip = $1`, [ip]);
    if (result.rowCount === 0) {
      return null;
    }

    return +result.rows[0].id;
  }

  protected async addIp(ip: string): Promise<number> {
    const result = await this.client.query(`INSERT INTO ips (ip) VALUES ($1) RETURNING id`, [ip]);
    return +result.rows[0].id;
  }
}

export default PgsqlPostAttributesRepository;
