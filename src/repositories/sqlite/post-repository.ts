import Board from '../../models/board';
import Post from '../../models/post';
import IPostRepository from '../../models/post-repository';
import Repository from './repository';

interface PostDto {
  readonly id: number;
  readonly board_id: number;
  readonly board_slug: string;
  readonly board_title: string;
  readonly board_created_at: number;
  readonly board_post_count: number;
  readonly parent_id: number;
  readonly name_id: number | null;
  readonly name: string | null;
  readonly tripcode_id: number | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly ip_id: number;
  readonly ip: string;
  readonly created_at: number;
}

export class PostRepository extends Repository implements IPostRepository {
  protected static readonly PER_PAGE = 100;
  protected static readonly MS_IN_SECOND = 1000;

  public async browse(): Promise<Post[]> {
    const sql = `SELECT
        p.*,
        b.id as board_id, b.slug as board_slug, b.title as board_title, b.created_at as board_created_at, b.post_count as board_post_count,
        n.name,
        t.tripcode,
        i.ip
      FROM posts p
      INNER JOIN boards b ON b.id = p.board_id
      LEFT JOIN names n ON n.id = p.name_id
      LEFT JOIN tripcodes t ON t.id = p.tripcode_id
      INNER JOIN ips i ON i.id = p.ip_id
      ORDER BY p.id`;

    const { rows } = await this.allAsync(sql);
    return rows.map(this.convertDtoToModel);
  }

  public async browseForThread(threadId: number): Promise<Post[]> {
    const sql = `SELECT
        p.*,
        b.id as board_id, b.slug as board_slug, b.title as board_title, b.created_at as board_created_at, b.post_count as board_post_count,
        n.name,
        t.tripcode,
        i.ip
      FROM posts p
      INNER JOIN boards b ON b.id = p.board_id
      LEFT JOIN names n ON n.id = p.name_id
      LEFT JOIN tripcodes t ON t.id = p.tripcode_id
      INNER JOIN ips i ON i.id = p.ip_id
      WHERE p.parent_id = ? OR p.id = ?
      ORDER BY p.id`;

    const { rows } = await this.allAsync(sql, [threadId, threadId]);
    return rows.map(this.convertDtoToModel);
  }

  public async read(id: number): Promise<Post | null> {
    const sql = `SELECT
        p.*,
        b.id as board_id, b.slug as board_slug, b.title as board_title, b.created_at as board_created_at, b.post_count as board_post_count,
        n.name,
        t.tripcode,
        i.ip
      FROM posts p
      INNER JOIN boards b ON b.id = p.board_id
      LEFT JOIN names n ON n.id = p.name_id
      LEFT JOIN tripcodes t ON t.id = p.tripcode_id
      INNER JOIN ips i ON i.id = p.ip_id
      WHERE p.id = ?
      ORDER BY p.id DESC
      LIMIT 1`;

    const { row } = await this.getAsync(sql, [id]);
    if (row === null) {
      return null;
    }

    return this.convertDtoToModel(row);
  }

  public async add(
    boardId: number,
    parentId: number,
    name: string,
    tripcode: string,
    message: string,
    ip: string
  ): Promise<Post | null> {
    const sql = `INSERT INTO posts(board_id, parent_id, name_id, tripcode_id, message, ip_id, created_at, bumped_at)
      VALUES (?, ?, ?, ?, ?, ?, strftime('%s','now'), NULL)`;

    const result = await this.runAsync(sql, [
      boardId,
      parentId,
      name.length ? await this.getNameId(name) : null,
      tripcode.length ? await this.getTripcodeId(tripcode) : null,
      message,
      await this.getIpId(ip),
    ]);
    return this.read(result.lastID);
  }

  protected async getNameId(name: string): Promise<number> {
    const { row } = await this.getAsync(`SELECT id FROM names WHERE name = ?`, [name]);
    if (row === null) {
      const statement = await this.runAsync(`INSERT INTO names (name) VALUES (?)`, [name]);
      return statement.lastID;
    }

    return row.id;
  }

  protected async getTripcodeId(tripcode: string): Promise<number> {
    const { row } = await this.getAsync(`SELECT id FROM tripcodes WHERE tripcode = ?`, [tripcode]);
    if (row === null) {
      const statement = await this.runAsync(`INSERT INTO tripcodes (tripcode) VALUES (?)`, [tripcode]);
      return statement.lastID;
    }

    return row.id;
  }

  protected async getIpId(ip: string): Promise<number> {
    const { row } = await this.getAsync(`SELECT id FROM ips WHERE ip = ?`, [ip]);
    if (row === null) {
      const statement = await this.runAsync(`INSERT INTO ips (ip) VALUES (?)`, [ip]);
      return statement.lastID;
    }

    return row.id;
  }

  public async delete(id: number): Promise<Post | null> {
    const post = await this.read(id);
    if (post === null) {
      return null;
    }

    const sql = `DELETE FROM posts
      WHERE id = ? AND parent_id IS NOT NULL`;

    await this.runAsync(sql, [id]);
    return post;
  }

  protected convertDtoToModel(dto: PostDto): Post {
    return new Post(
      +dto.id,
      new Board(
        +dto.board_id,
        dto.board_slug,
        dto.board_title,
        new Date(+dto.board_created_at * PostRepository.MS_IN_SECOND),
        +dto.board_post_count
      ),
      +(dto.parent_id || 0),
      dto.name,
      dto.tripcode,
      dto.message,
      dto.ip,
      new Date(dto.created_at * PostRepository.MS_IN_SECOND)
    );
  }
}

export default PostRepository;
