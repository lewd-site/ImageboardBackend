import Repository from './repository';

export class PostAttributesRepository extends Repository {
  public async readOrAddName(name: string): Promise<number> {
    const id = await this.readName(name);
    if (id === null) {
      return this.addName(name);
    }

    return id;
  }

  protected async readName(name: string): Promise<number | null> {
    const { row } = await this.getAsync(`SELECT id FROM names WHERE name = ?`, [name]);
    return row.id;
  }

  protected async addName(name: string): Promise<number> {
    const { row } = await this.getAsync(`INSERT INTO names (name) VALUES (?) RETURNING id`, [name]);
    return row.id;
  }

  public async readOrAddTripcode(tripcode: string): Promise<number> {
    const id = await this.readTripcode(tripcode);
    if (id === null) {
      return this.addTripcode(tripcode);
    }

    return id;
  }

  protected async readTripcode(tripcode: string): Promise<number | null> {
    const { row } = await this.getAsync(`SELECT id FROM tripcodes WHERE tripcode = ?`, [tripcode]);
    return row.id;
  }

  protected async addTripcode(tripcode: string): Promise<number> {
    const { row } = await this.getAsync(`INSERT INTO tripcodes (tripcode) VALUES (?) RETURNING id`, [tripcode]);
    return row.id;
  }

  public async readOrAddIp(ip: string): Promise<number> {
    const id = await this.readIp(ip);
    if (id === null) {
      return this.addIp(ip);
    }

    return id;
  }

  protected async readIp(ip: string): Promise<number | null> {
    const { row } = await this.getAsync(`SELECT id FROM ips WHERE ip = ?`, [ip]);
    return row.id;
  }

  protected async addIp(ip: string): Promise<number> {
    const { row } = await this.getAsync(`INSERT INTO ips (ip) VALUES (?) RETURNING id`, [ip]);
    return row.id;
  }
}

export default PostAttributesRepository;
