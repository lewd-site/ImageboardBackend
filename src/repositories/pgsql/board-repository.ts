import Board from '../../models/board';
import IBoardRepository from '../../models/board-repository';
import PgsqlRepository from './repository';

interface BoardDto {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly post_count: number;
  readonly created_at: Date;
}

export class PgsqlBoardRepository extends PgsqlRepository implements IBoardRepository {
  protected static readonly PER_PAGE = 100;

  public async browse(page: number = 0): Promise<Board[]> {
    const limit = PgsqlBoardRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * PgsqlBoardRepository.PER_PAGE;
    const sql = `SELECT * FROM boards
      ORDER BY post_count DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await this.client.query(sql);
    return rows.map(this.convertDtoToModel);
  }

  public async read(id: number): Promise<Board | null> {
    const sql = `SELECT * FROM boards
      WHERE id = $1
      ORDER BY id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [id]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.convertDtoToModel(result.rows[0]);
  }

  public async readBySlug(slug: string): Promise<Board | null> {
    const sql = `SELECT * FROM boards
      WHERE slug = $1
      ORDER BY id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [slug]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.convertDtoToModel(result.rows[0]);
  }

  public async edit(id: number, slug: string, title: string): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `UPDATE boards
      SET slug = $1, title = $2
      WHERE id = $3`;

    await this.client.query(sql, [slug, title, id]);
    return this.readBySlug(slug);
  }

  public async incrementPostCount(id: number): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `UPDATE boards
      SET post_count = post_count + 1
      WHERE id = $1`;

    await this.client.query(sql, [id]);
    return await this.read(id);
  }

  public async calculatePostCount(id: number): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `UPDATE boards
      SET post_count = (SELECT COUNT(*) FROM posts AS p WHERE p.board_id = $1)
      WHERE id = $1`;

    await this.client.query(sql, [id]);
    return await this.read(id);
  }

  public async add(slug: string, title: string): Promise<Board | null> {
    const sql = `INSERT INTO boards(slug, title, post_count, created_at)
      VALUES ($1, $2, 0, now())`;

    await this.client.query(sql, [slug, title]);
    return this.readBySlug(slug);
  }

  public async delete(id: number): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `DELETE FROM boards
      WHERE id = $1`;

    await this.client.query(sql, [id]);
    return board;
  }

  protected convertDtoToModel(dto: BoardDto): Board {
    return new Board(+dto.id, dto.slug, dto.title, dto.created_at, +dto.post_count);
  }
}

export default PgsqlBoardRepository;
