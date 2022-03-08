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
    if (row === null) {
      return null;
    }

    return row.id;
  }

  protected async addName(name: string): Promise<number> {
    const result = await this.runAsync(`INSERT INTO names (name) VALUES (?)`, [name]);
    return result.lastID;
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
    if (row === null) {
      return null;
    }

    return row.id;
  }

  protected async addTripcode(tripcode: string): Promise<number> {
    const result = await this.runAsync(`INSERT INTO tripcodes (tripcode) VALUES (?)`, [tripcode]);
    return result.lastID;
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
    if (row === null) {
      return null;
    }

    return row.id;
  }

  protected async addIp(ip: string): Promise<number> {
    const result = await this.runAsync(`INSERT INTO ips (ip) VALUES (?)`, [ip]);
    return result.lastID;
  }
}

export default PostAttributesRepository;
