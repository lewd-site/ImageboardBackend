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

  protected async addReference(sourceId: number, targetId: number): Promise<void> {
    const sql = `INSERT INTO post_references (source_id, target_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
    const params = [sourceId, targetId];
    await this.client.query(sql, params);
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

  public addPostReferences(post: Post): Promise<void> {
    return this.addReferences(post.id, post.parsedMessage);
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
    const id = +result.rows[0].id;
    await this.addReferences(id, parsedMessage);

    return this.read(id);
  }

  public async updateMessage(id: number, message: string, parsedMessage: Node[]): Promise<void> {
    const sql = `UPDATE posts SET message = $1, message_parsed = $2 WHERE id = $3`;
    const params = [message, JSON.stringify(parsedMessage), id];
    await this.client.query(sql, params);
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
    const sql = `SELECT ranked.* FROM (
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
      ) AS ranked WHERE rank <= 3`;

    const { rows } = await this.client.query(sql);
    for (const row of rows) {
      const post = this.convertDtoToModel(row);
      threadsMap[row.parent_id].replies.push(post);
    }
  }

  public loadLatestRepliesForThread(thread: Thread): Promise<void> {
    return this.loadLatestRepliesForThreads([thread]);
  }

  public async loadReferencesForPosts(posts: (Post | Thread)[]): Promise<void> {
    const postsMap = new Map<number, Post | Thread>();
    for (const post of posts) {
      postsMap.set(post.id, post);
    }

    const postIds = [...postsMap.keys()];
    const sql = `SELECT s.id as source_id, s.parent_id as source_parent_id, t.id as target_id, t.parent_id as target_parent_id
      FROM post_references pr
      INNER JOIN posts s ON pr.source_id = s.id
      INNER JOIN posts t ON pr.target_id = t.id
      WHERE pr.source_id IN (${postIds.join(',')}) OR pr.target_id IN (${postIds.join(',')})`;

    const { rows } = await this.client.query(sql);
    for (const row of rows) {
      const source = postsMap.get(row.source_id);
      if (typeof source !== 'undefined') {
        source.references.push({
          sourceId: row.source_id,
          sourceParentId: row.source_parent_id,
          targetId: row.target_id,
          targetParentId: row.target_parent_id,
        });
      }

      const target = postsMap.get(row.target_id);
      if (typeof target !== 'undefined') {
        target.referencedBy.push({
          sourceId: row.source_id,
          sourceParentId: row.source_parent_id,
          targetId: row.target_id,
          targetParentId: row.target_parent_id,
        });
      }
    }
  }

  public loadReferencesForPost(post: Post | Thread): Promise<void> {
    return this.loadReferencesForPosts([post]);
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
