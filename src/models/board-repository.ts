import Board from './board';
import IRepository from './repository';

export interface IBoardRepository extends IRepository {
  browse(page?: number): Promise<Board[]>;
  read(id: number): Promise<Board | null>;
  readBySlug(slug: string): Promise<Board | null>;
  edit(id: number, slug: string, title: string): Promise<Board | null>;
  incrementPostCount(id: number): Promise<Board | null>;
  add(slug: string, title: string): Promise<Board | null>;
  delete(id: number): Promise<Board | null>;
}

export default IBoardRepository;
