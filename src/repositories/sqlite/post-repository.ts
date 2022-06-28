import sqlite3 from 'sqlite3';
import Board from '../../models/board';
import IEmbedRepository from '../../models/embed-repository';
import { Node } from '../../models/markup';
import Post from '../../models/post';
import IPostRepository from '../../models/post-repository';
import Thread from '../../models/thread';
import SqlitePostAttributesRepository from './post-attributes-repository';
import SqliteRepository from './repository';

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
  readonly message_parsed: string;
  readonly ip_id: number;
  readonly ip: string;
  readonly created_at: number;
}

export class SqlitePostRepository extends SqliteRepository implements IPostRepository {
  protected static readonly PER_PAGE = 100;

  public constructor(
    db: sqlite3.Database,
    protected readonly postAttributesRepository: SqlitePostAttributesRepository,
    protected readonly embedRepository: IEmbedRepository
  ) {
    super(db);
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

    const { rows } = await this.allAsync(sql);
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
      WHERE p.board_id = ?
      ORDER BY p.id`;

    const { rows } = await this.allAsync(sql, [boardId]);
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

  public addPostReferences(post: Post): Promise<void> {
    return this.addReferences(post.id, post.parsedMessage);
  }

  protected async addEmbeds(postId: number, nodes: Node[]): Promise<void> {
    for (const node of nodes) {
      if (node.type === 'link') {
        const embed = await this.embedRepository.readByUrl(node.url);
        if (embed !== null) {
          this.embedRepository.addPostEmbedLink(postId, embed.id);
        }
      }
    }
  }

  public addPostEmbeds(post: Post): Promise<void> {
    return this.addEmbeds(post.id, post.parsedMessage);
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
    const createdAtValue = typeof createdAt !== 'undefined' ? '?' : "strftime('%s','now')";
    const sql = `INSERT INTO posts (board_id, parent_id, name_id, tripcode_id, message, message_parsed, ip_id, created_at, bumped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ${createdAtValue}, NULL)`;

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
      params.push(createdAt.getTime() / SqlitePostRepository.MS_IN_SECOND);
    }

    const result = await this.runAsync(sql, params);
    const id = result.lastID;
    await this.addReferences(id, parsedMessage);
    await this.addEmbeds(id, parsedMessage);

    return this.read(id);
  }

  public async updateMessage(id: number, message: string, parsedMessage: Node[]): Promise<void> {
    const sql = `UPDATE posts SET message = ?, message_parsed = ? WHERE id = ?`;
    const params = [message, JSON.stringify(parsedMessage), id];
    await this.runAsync(sql, params);
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

    const { rows } = await this.allAsync(sql);
    for (const row of rows) {
      const post = this.convertDtoToModel(row);
      threadsMap[row.parent_id].replies.push(post);
    }
  }

  public loadLatestRepliesForThread(thread: Thread): Promise<void> {
    return this.loadLatestRepliesForThreads([thread]);
  }

  public async loadReferencesForPosts(posts: (Post | Thread)[]): Promise<void> {
    if (!posts.length) {
      return;
    }

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

    const { rows } = await this.allAsync(sql);
    for (const row of rows) {
      const source = postsMap.get(row.source_id)!;
      source.references.push({
        sourceId: row.source_id,
        sourceParentId: row.source_parent_id,
        targetId: row.target_id,
        targetParentId: row.target_parent_id,
      });

      const target = postsMap.get(row.target_id)!;
      target.referencedBy.push({
        sourceId: row.source_id,
        sourceParentId: row.source_parent_id,
        targetId: row.target_id,
        targetParentId: row.target_parent_id,
      });
    }
  }

  public loadReferencesForPost(post: Post | Thread): Promise<void> {
    return this.loadReferencesForPosts([post]);
  }

  protected convertDtoToModel(dto: PostDto): Post {
    return new Post(
      +dto.id,
      new Board(
        +dto.board_id,
        dto.board_slug,
        dto.board_title,
        new Date(+dto.board_created_at * SqlitePostRepository.MS_IN_SECOND),
        +dto.board_post_count
      ),
      +(dto.parent_id || 0),
      dto.name,
      dto.tripcode,
      dto.message,
      JSON.parse(dto.message_parsed),
      dto.ip,
      new Date(dto.created_at * SqlitePostRepository.MS_IN_SECOND)
    );
  }
}

export default SqlitePostRepository;
