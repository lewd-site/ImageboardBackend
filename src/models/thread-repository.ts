import IRepository from './repository';
import Thread from './thread';

export interface IThreadRepository extends IRepository {
  browse(page?: number): Promise<Thread[]>;
  browseForBoard(boardId: number, page?: number): Promise<Thread[]>;
  read(id: number): Promise<Thread | null>;
  add(boardId: number, name: string, message: string, ip: string): Promise<Thread | null>;
  delete(id: number): Promise<Thread | null>;
}

export default IThreadRepository;