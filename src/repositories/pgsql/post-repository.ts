import { ClientBase } from 'pg';
import Board from '../../models/board';
import { Node } from '../../models/markup';
import Post from '../../models/post';
import IPostRepository from '../../models/post-repository';
import Thread from '../../models/thread';
import PgsqlPostAttributesRepository from './post-attributes-repository';
import PgsqlRepository from './repository';

interface PostDto {
  readonly id: number;
  readonly board_id: number;
  readonly board_slug: string;
  readonly board_title: string;
  readonly board_created_at: Date;
  readonly board_post_count: number;
  readonly parent_id: number;
  readonly name_id: number | null;
  readonly name: string | null;
  readonly tripcode_id: number | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly message_parsed: string;
  readonly ip_id: number;
  readonly ip: string;
  readonly created_at: Date;
}

export class PgsqlPostRepository extends PgsqlRepository implements IPostRepository {
  protected static readonly PER_PAGE = 100;
  protected static readonly MS_IN_SECOND = 1000;

  public constructor(client: ClientBase, protected readonly postAttributesRepository: PgsqlPostAttributesRepository) {
    super(client);
  }

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

    const { rows } = await this.client.query(sql);
    return rows.map(this.convertDtoToModel);
  }

  public async browseForBoard(boardId: number): Promise<Post[]> {
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
      WHERE p.board_id = $1
      ORDER BY p.id`;

    const { rows } = await this.client.query(sql, [boardId]);
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
      WHERE p.parent_id = $1 OR p.id = $2
      ORDER BY p.id`;

    const { rows } = await this.client.query(sql, [threadId, threadId]);
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
      WHERE p.id = $1
      ORDER BY p.id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [id]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.convertDtoToModel(result.rows[0]);
  }

  public async add(
    boardId: number,
    parentId: number,
    name: string,
    tripcode: string,
    message: string,
    parsedMessage: Node[],
    ip: string,
    createdAt?: Date
  ): Promise<Post | null> {
    const createdAtValue = typeof createdAt !== 'undefined' ? '$8' : 'now()';
    const sql = `INSERT INTO posts (board_id, parent_id, name_id, tripcode_id, message, message_parsed, ip_id, created_at, bumped_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, ${createdAtValue}, NULL)
      RETURNING id`;

    const params = [
      boardId,
      parentId,
      name.length ? await this.postAttributesRepository.readOrAddName(name) : null,
      tripcode.length ? await this.postAttributesRepository.readOrAddTripcode(tripcode) : null,
      message,
      JSON.stringify(parsedMessage),
      await this.postAttributesRepository.readOrAddIp(ip),
    ];

    if (typeof createdAt !== 'undefined') {
      params.push(createdAt.toISOString());
    }

    const result = await this.client.query(sql, params);
    return this.read(+result.rows[0].id);
  }

  public async delete(id: number): Promise<Post | null> {
    const post = await this.read(id);
    if (post === null) {
      return null;
    }

    const sql = `DELETE FROM posts
      WHERE id = $1 AND parent_id IS NOT NULL`;

    await this.client.query(sql, [id]);
    return post;
  }

  public async loadLatestRepliesForThreads(threads: Thread[]): Promise<void> {
    if (!threads.length) {
      return;
    }

    const threadsMap: { [id: number]: Thread } = {};
    for (const thread of threads) {
      threadsMap[thread.id] = thread;
    }

    const threadIds = threads.map((thread) => thread.id);
    const sql = `SELECT * FROM (
        SELECT
          p.*,
          b.id as board_id, b.slug as board_slug, b.title as board_title, b.created_at as board_created_at, b.post_count as board_post_count,
          n.name,
          t.tripcode,
          i.ip,
          RANK() OVER (PARTITION BY p.parent_id ORDER BY p.id DESC) AS rank
        FROM posts p
        INNER JOIN boards b ON b.id = p.board_id
        LEFT JOIN names n ON n.id = p.name_id
        LEFT JOIN tripcodes t ON t.id = p.tripcode_id
        INNER JOIN ips i ON i.id = p.ip_id
        WHERE p.parent_id IN (${threadIds.join(',')})
        ORDER BY p.id
      ) WHERE rank <= 3`;

    const { rows } = await this.client.query(sql);
    for (const row of rows) {
      const post = this.convertDtoToModel(row);
      threadsMap[row.parent_id].replies.push(post);
    }
  }

  public loadLatestRepliesForThread(thread: Thread): Promise<void> {
    return this.loadLatestRepliesForThreads([thread]);
  }

  protected convertDtoToModel(dto: PostDto): Post {
    return new Post(
      +dto.id,
      new Board(+dto.board_id, dto.board_slug, dto.board_title, dto.board_created_at, +dto.board_post_count),
      +(dto.parent_id || 0),
      dto.name,
      dto.tripcode,
      dto.message,
      JSON.parse(dto.message_parsed),
      dto.ip,
      dto.created_at
    );
  }
}

export default PgsqlPostRepository;
