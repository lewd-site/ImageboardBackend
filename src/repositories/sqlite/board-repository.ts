import * as sqlite3 from 'sqlite3';
import Board from '../../models/board';
import IBoardRepository from '../../models/board-repository';

interface BoardDto {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly post_count: number;
  readonly created_at: number;
}

export class BoardRepository implements IBoardRepository {
  protected static readonly PER_PAGE = 100;
  protected static readonly MS_IN_SECOND = 1000;

  public constructor(protected readonly db: sqlite3.Database) {}

  public browse(page: number = 0): Promise<Board[]> {
    const limit = BoardRepository.PER_PAGE;
    const offset = Math.max(0, Math.floor(page)) * BoardRepository.PER_PAGE;
    const sql = `SELECT * FROM boards
      ORDER BY post_count DESC, created_at DESC
      LIMIT ${limit} OFFSET ${offset}`;

    return new Promise((resolve, reject) => {
      this.db.all(sql, (err, rows) => {
        if (err !== null) {
          return reject(err);
        }

        resolve(rows.map(this.convertDtoToModel));
      });
    });
  }

  public read(id: number): Promise<Board | null> {
    const sql = `SELECT * FROM boards
      WHERE id = ?
      ORDER BY id DESC
      LIMIT 1`;

    return new Promise((resolve, reject) => {
      this.db.get(sql, [id], (err, row) => {
        if (err !== null) {
          return reject(err);
        }

        if (typeof row === 'undefined') {
          return resolve(null);
        }

        resolve(this.convertDtoToModel(row));
      });
    });
  }

  public readBySlug(slug: string): Promise<Board | null> {
    const sql = `SELECT * FROM boards
      WHERE slug = ?
      ORDER BY id DESC
      LIMIT 1`;

    return new Promise((resolve, reject) => {
      this.db.get(sql, [slug], (err, row) => {
        if (err !== null) {
          return reject(err);
        }

        if (typeof row === 'undefined') {
          return resolve(null);
        }

        resolve(this.convertDtoToModel(row));
      });
    });
  }

  public async edit(id: number, slug: string, title: string): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `UPDATE boards
      SET slug = ?, title = ?
      WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [slug, title, id], (err) => {
        if (err !== null) {
          return reject(err);
        }

        resolve(this.readBySlug(slug));
      });
    });
  }

  public add(slug: string, title: string): Promise<Board | null> {
    const sql = `INSERT INTO boards(slug, title, post_count, created_at)
      VALUES (?, ?, 0, strftime('%s','now'))`;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [slug, title], (err) => {
        if (err !== null) {
          return reject(err);
        }

        resolve(this.readBySlug(slug));
      });
    });
  }

  public async delete(id: number): Promise<Board | null> {
    const board = await this.read(id);
    if (board === null) {
      return null;
    }

    const sql = `DELETE FROM boards
      WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [id], (err) => {
        if (err !== null) {
          return reject(err);
        }

        resolve(board);
      });
    });
  }

  protected convertDtoToModel(dto: BoardDto): Board {
    return new Board(
      dto.id,
      dto.slug,
      dto.title,
      new Date(dto.created_at * BoardRepository.MS_IN_SECOND),
      dto.post_count
    );
  }
}

export default BoardRepository;
