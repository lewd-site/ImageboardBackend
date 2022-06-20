import sqlite3 from 'sqlite3';
import Board from '../../models/board';
import { Node } from '../../models/markup';
import Thread from '../../models/thread';
import IThreadRepository from '../../models/thread-repository';
import SqlitePostAttributesRepository from './post-attributes-repository';
import SqliteRepository from './repository';

interface ThreadDto {
  readonly id: number;
  readonly board_id: number;
  readonly board_slug: string;
  readonly board_title: string;
  readonly board_created_at: number;
  readonly board_post_count: number;
  readonly subject: string | null;
  readonly name_id: number | null;
  readonly name: string | null;
  readonly tripcode_id: number | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly message_parsed: string;
  readonly ip_id: number;
  readonly ip: string;
  readonly post_count: number;
  readonly created_at: number;
  readonly bumped_at: number;
}

export class SqliteThreadRepository extends SqliteRepository implements IThreadRepository {
  protected static readonly PER_PAGE = 10;
  protected static readonly MS_IN_SECOND = 1000;

  public constructor(
    db: sqlite3.Database,
    protected readonly postAttributesRepository: SqlitePostAttributesRepository
  ) {
    super(db);
  }

  public async browse(page: number = 0): Promise<Thread[]> {
    const limit = SqliteThreadRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * SqliteThreadRepository.PER_PAGE;
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
      WHERE p.parent_id IS NULL
      ORDER BY p.bumped_at DESC, p.id DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await this.allAsync(sql);
    return rows.map(this.convertDtoToModel);
  }

  public async browseForBoard(boardId: number, page: number = 0): Promise<Thread[]> {
    const limit = SqliteThreadRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * SqliteThreadRepository.PER_PAGE;
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
      WHERE p.board_id = ? AND p.parent_id IS NULL
      ORDER BY p.bumped_at DESC, p.id DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await this.allAsync(sql, [boardId]);
    return rows.map(this.convertDtoToModel);
  }

  public async read(id: number): Promise<Thread | null> {
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
      WHERE p.id = ? AND p.parent_id IS NULL
      ORDER BY p.id DESC
      LIMIT 1`;

    const { row } = await this.getAsync(sql, [id]);
    if (row === null) {
      return null;
    }

    return this.convertDtoToModel(row);
  }

  public async incrementPostCount(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `UPDATE posts
      SET post_count = post_count + 1
      WHERE id = ?`;

    await this.runAsync(sql, [id]);
    return await this.read(id);
  }

  public async calculatePostCount(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `UPDATE posts
      SET post_count = (SELECT COUNT(*) FROM posts AS p WHERE p.parent_id = ? OR p.id = ?)
      WHERE id = ?`;

    await this.runAsync(sql, [id, id, id]);
    return await this.read(id);
  }

  public async bumpThread(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `UPDATE posts
      SET bumped_at = strftime('%s','now')
      WHERE id = ?`;

    await this.runAsync(sql, [id]);
    return await this.read(id);
  }

  protected async addReference(sourceId: number, targetId: number): Promise<void> {
    const sql = `INSERT OR IGNORE INTO post_references (source_id, target_id) VALUES (?, ?)`;
    const params = [sourceId, targetId];
    await this.runAsync(sql, params);
  }

  protected async addReferences(sourceId: number, nodes: Node[]): Promise<void> {
    for (const node of nodes) {
      if (node.type === 'reflink') {
        await this.addReference(sourceId, node.postID);
      } else if (typeof (node as any).children !== 'undefined') {
        await this.addReferences(sourceId, (node as any).children);
      }
    }
  }

  public async add(
    boardId: number,
    subject: string,
    name: string,
    tripcode: string,
    message: string,
    parsedMessage: Node[],
    ip: string,
    createdAt?: Date,
    bumpedAt?: Date
  ): Promise<Thread | null> {
    const createdAtValue = typeof createdAt !== 'undefined' ? '?' : "strftime('%s','now')";
    const bumpedAtValue = typeof bumpedAt !== 'undefined' ? '?' : "strftime('%s','now')";
    const sql = `INSERT INTO posts(board_id, parent_id, subject, name_id, tripcode_id, message, message_parsed, ip_id, post_count, created_at, bumped_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, ${createdAtValue}, ${bumpedAtValue})`;

    const params = [
      boardId,
      subject.length ? subject : null,
      name.length ? await this.postAttributesRepository.readOrAddName(name) : null,
      tripcode.length ? await this.postAttributesRepository.readOrAddTripcode(tripcode) : null,
      message,
      JSON.stringify(parsedMessage),
      await this.postAttributesRepository.readOrAddIp(ip),
    ];

    if (typeof createdAt !== 'undefined') {
      params.push(createdAt.getTime() / SqliteThreadRepository.MS_IN_SECOND);
    }

    if (typeof bumpedAt !== 'undefined') {
      params.push(bumpedAt.getTime() / SqliteThreadRepository.MS_IN_SECOND);
    }

    const result = await this.runAsync(sql, params);
    const id = result.lastID;
    await this.addReferences(id, parsedMessage);

    return this.read(id);
  }

  public async delete(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `DELETE FROM posts
      WHERE id = ? AND parent_id IS NULL`;

    await this.runAsync(sql, [id]);
    return thread;
  }

  protected convertDtoToModel(dto: ThreadDto): Thread {
    return new Thread(
      +dto.id,
      new Board(
        +dto.board_id,
        dto.board_slug,
        dto.board_title,
        new Date(+dto.board_created_at * SqliteThreadRepository.MS_IN_SECOND),
        +dto.board_post_count
      ),
      dto.subject,
      dto.name,
      dto.tripcode,
      dto.message,
      JSON.parse(dto.message_parsed),
      dto.ip,
      +dto.post_count,
      new Date(dto.created_at * SqliteThreadRepository.MS_IN_SECOND),
      new Date(dto.bumped_at * SqliteThreadRepository.MS_IN_SECOND)
    );
  }
}

export default SqliteThreadRepository;
