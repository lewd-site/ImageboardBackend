import { ClientBase } from 'pg';
import Board from '../../models/board';
import IEmbedRepository from '../../models/embed-repository';
import { Node } from '../../models/markup';
import Thread from '../../models/thread';
import IThreadRepository from '../../models/thread-repository';
import PgsqlPostAttributesRepository from './post-attributes-repository';
import PgsqlRepository from './repository';

interface ThreadDto {
  readonly id: number;
  readonly board_id: number;
  readonly board_slug: string;
  readonly board_title: string;
  readonly board_created_at: Date;
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
  readonly created_at: Date;
  readonly bumped_at: Date;
}

export class PgsqlThreadRepository extends PgsqlRepository implements IThreadRepository {
  protected static readonly PER_PAGE = 10;

  public constructor(
    client: ClientBase,
    protected readonly postAttributesRepository: PgsqlPostAttributesRepository,
    protected readonly embedRepository: IEmbedRepository
  ) {
    super(client);
  }

  public async browse(page: number = 0): Promise<Thread[]> {
    const limit = PgsqlThreadRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * PgsqlThreadRepository.PER_PAGE;
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

    const { rows } = await this.client.query(sql);
    return rows.map(this.convertDtoToModel);
  }

  public async browseForBoard(boardId: number, page: number = 0): Promise<Thread[]> {
    const limit = PgsqlThreadRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * PgsqlThreadRepository.PER_PAGE;
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
      WHERE p.board_id = $1 AND p.parent_id IS NULL
      ORDER BY p.bumped_at DESC, p.id DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await this.client.query(sql, [boardId]);
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
      WHERE p.id = $1 AND p.parent_id IS NULL
      ORDER BY p.id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [id]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.convertDtoToModel(result.rows[0]);
  }

  public async incrementPostCount(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `UPDATE posts
      SET post_count = post_count + 1
      WHERE id = $1`;

    await this.client.query(sql, [id]);
    return await this.read(id);
  }

  public async calculatePostCount(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `UPDATE posts
      SET post_count = (SELECT COUNT(*) FROM posts AS p WHERE p.parent_id = $1 OR p.id = $1)
      WHERE id = $1`;

    await this.client.query(sql, [id]);
    return await this.read(id);
  }

  public async bumpThread(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `UPDATE posts
      SET bumped_at = now()
      WHERE id = $1`;

    await this.client.query(sql, [id]);
    return await this.read(id);
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
    const createdAtValue = typeof createdAt !== 'undefined' ? '$8' : 'now()';
    const bumpedAtValue = typeof bumpedAt !== 'undefined' ? '$9' : 'now()';
    const sql = `INSERT INTO posts(board_id, parent_id, subject, name_id, tripcode_id, message, message_parsed, ip_id, post_count, created_at, bumped_at)
      VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 1, ${createdAtValue}, ${bumpedAtValue})
      RETURNING id`;

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
      params.push(createdAt.toISOString());
    }

    if (typeof bumpedAt !== 'undefined') {
      params.push(bumpedAt.toISOString());
    }

    const result = await this.client.query(sql, params);
    const id = +result.rows[0].id;
    await this.addReferences(id, parsedMessage);
    await this.addEmbeds(id, parsedMessage);

    return this.read(id);
  }

  public async delete(id: number): Promise<Thread | null> {
    const thread = await this.read(id);
    if (thread === null) {
      return null;
    }

    const sql = `DELETE FROM posts
      WHERE id = $1 AND parent_id IS NULL`;

    await this.client.query(sql, [id]);
    return thread;
  }

  protected convertDtoToModel(dto: ThreadDto): Thread {
    return new Thread(
      +dto.id,
      new Board(+dto.board_id, dto.board_slug, dto.board_title, dto.board_created_at, +dto.board_post_count),
      dto.subject,
      dto.name,
      dto.tripcode,
      dto.message,
      JSON.parse(dto.message_parsed),
      dto.ip,
      +dto.post_count,
      dto.created_at,
      dto.bumped_at
    );
  }
}

export default PgsqlThreadRepository;
