import Board from '../../models/board';
import IBoardRepository from '../../models/board-repository';
import Repository from './repository';

interface BoardDto {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly post_count: number;
  readonly created_at: number;
}

export class BoardRepository extends Repository implements IBoardRepository {
  protected static readonly PER_PAGE = 100;
  protected static readonly MS_IN_SECOND = 1000;

  public async browse(page: number = 0): Promise<Board[]> {
    const limit = BoardRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * BoardRepository.PER_PAGE;
    const sql = `SELECT * FROM boards
      ORDER BY post_count DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await this.allAsync(sql);
    return rows.map(this.convertDtoToModel);
  }

  public async read(id: number): Promise<Board | null> {
    const sql = `SELECT * FROM boards
      WHERE id = ?
      ORDER BY id DESC
      LIMIT 1`;

    const { row } = await this.getAsync(sql, [id]);
    if (row === null) {
      return null;
    }

    return this.convertDtoToModel(row);
  }

  public async readBySlug(slug: string): Promise<Board | null> {
    const sql = `SELECT * FROM boards
      WHERE slug = ?
      ORDER BY id DESC
      LIMIT 1`;

    const { row } = await this.getAsync(sql, [slug]);
    if (row === null) {
      return null;
    }

    return this.convertDtoToModel(row);
  }

  public async edit(id: number, slug: string, title: string): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `UPDATE boards
      SET slug = ?, title = ?
      WHERE id = ?`;

    await this.runAsync(sql, [slug, title, id]);
    return this.readBySlug(slug);
  }

  public async incrementPostCount(id: number): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `UPDATE boards
      SET post_count = post_count + 1
      WHERE id = ?`;

    await this.runAsync(sql, [id]);
    return await this.read(id);
  }

  public async add(slug: string, title: string): Promise<Board | null> {
    const sql = `INSERT INTO boards(slug, title, post_count, created_at)
      VALUES (?, ?, 0, strftime('%s','now'))`;

    await this.runAsync(sql, [slug, title]);
    return this.readBySlug(slug);
  }

  public async delete(id: number): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `DELETE FROM boards
      WHERE id = ?`;

    await this.runAsync(sql, [id]);
    return board;
  }

  protected convertDtoToModel(dto: BoardDto): Board {
    return new Board(
      +dto.id,
      dto.slug,
      dto.title,
      new Date(dto.created_at * BoardRepository.MS_IN_SECOND),
      +dto.post_count
    );
  }
}

export default BoardRepository;
