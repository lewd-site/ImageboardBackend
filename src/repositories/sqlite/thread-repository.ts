import sqlite3 from 'sqlite3';
import Board from '../../models/board';
import Thread from '../../models/thread';
import IThreadRepository from '../../models/thread-repository';
import PostAttributesRepository from './post-attributes-repository';
import Repository from './repository';

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
  readonly ip_id: number;
  readonly ip: string;
  readonly post_count: number;
  readonly created_at: number;
  readonly bumped_at: number;
}

export class ThreadRepository extends Repository implements IThreadRepository {
  protected static readonly PER_PAGE = 10;
  protected static readonly MS_IN_SECOND = 1000;

  public constructor(db: sqlite3.Database, protected readonly postAttributesRepository: PostAttributesRepository) {
    super(db);
  }

  public async browse(page: number = 0): Promise<Thread[]> {
    const limit = ThreadRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * ThreadRepository.PER_PAGE;
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
    const limit = ThreadRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * ThreadRepository.PER_PAGE;
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

  public async add(
    boardId: number,
    subject: string,
    name: string,
    tripcode: string,
    message: string,
    ip: string
  ): Promise<Thread | null> {
    const sql = `INSERT INTO posts(board_id, parent_id, subject, name_id, tripcode_id, message, ip_id, post_count, created_at, bumped_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?, 1, strftime('%s','now'), strftime('%s','now'))`;

    const result = await this.runAsync(sql, [
      boardId,
      subject.length ? subject : null,
      name.length ? await this.postAttributesRepository.readOrAddName(name) : null,
      tripcode.length ? await this.postAttributesRepository.readOrAddTripcode(tripcode) : null,
      message,
      await this.postAttributesRepository.readOrAddIp(ip),
    ]);

    return this.read(result.lastID);
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
        new Date(+dto.board_created_at * ThreadRepository.MS_IN_SECOND),
        +dto.board_post_count
      ),
      dto.subject,
      dto.name,
      dto.tripcode,
      dto.message,
      dto.ip,
      +dto.post_count,
      new Date(dto.created_at * ThreadRepository.MS_IN_SECOND),
      new Date(dto.bumped_at * ThreadRepository.MS_IN_SECOND)
    );
  }
}

export default ThreadRepository;
