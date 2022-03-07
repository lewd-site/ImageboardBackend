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
  readonly name: string;
  readonly message: string;
  readonly ip: string;
  readonly created_at: number;
}

export class PostRepository extends Repository implements IPostRepository {
  protected static readonly PER_PAGE = 100;
  protected static readonly MS_IN_SECOND = 1000;

  public async browse(): Promise<Post[]> {
    const sql = `SELECT
        p.*,
        b.id as board_id, b.slug as board_slug, b.title as board_title, b.created_at as board_created_at, b.post_count as board_post_count
      FROM posts p
      INNER JOIN boards b ON b.id = p.board_id
      ORDER BY p.id`;

    const { rows } = await this.allAsync(sql);
    return rows.map(this.convertDtoToModel);
  }

  public async browseForThread(threadId: number): Promise<Post[]> {
    const sql = `SELECT
        p.*,
        b.id as board_id, b.slug as board_slug, b.title as board_title, b.created_at as board_created_at, b.post_count as board_post_count
      FROM posts p
      INNER JOIN boards b ON b.id = p.board_id
      WHERE p.parent_id = ? OR p.id = ?
      ORDER BY p.id`;

    const { rows } = await this.allAsync(sql, [threadId, threadId]);
    return rows.map(this.convertDtoToModel);
  }

  public async read(id: number): Promise<Post | null> {
    const sql = `SELECT
        p.*,
        b.id as board_id, b.slug as board_slug, b.title as board_title, b.created_at as board_created_at, b.post_count as board_post_count
      FROM posts p
      INNER JOIN boards b ON b.id = p.board_id
      WHERE p.id = ?
      ORDER BY p.id DESC
      LIMIT 1`;

    const { row } = await this.getAsync(sql, [id]);
    if (row === null) {
      return null;
    }

    return this.convertDtoToModel(row);
  }

  public async add(boardId: number, parentId: number, name: string, message: string, ip: string): Promise<Post | null> {
    const sql = `INSERT INTO posts(board_id, parent_id, name, message, ip, created_at, bumped_at)
      VALUES (?, ?, ?, ?, ?, strftime('%s','now'), NULL)`;

    const result = await this.runAsync(sql, [boardId, parentId, name, message, ip]);
    return this.read(result.lastID);
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
      dto.message,
      dto.ip,
      new Date(dto.created_at * PostRepository.MS_IN_SECOND)
    );
  }
}

export default PostRepository;
