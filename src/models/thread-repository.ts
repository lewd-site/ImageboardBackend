import { Node } from './markup';
import IRepository from './repository';
import Thread from './thread';

export interface IThreadRepository extends IRepository {
  browse(page?: number): Promise<Thread[]>;
  browseForBoard(boardId: number, page?: number): Promise<Thread[]>;
  read(id: number): Promise<Thread | null>;
  incrementPostCount(id: number): Promise<Thread | null>;
  calculatePostCount(id: number): Promise<Thread | null>;
  bumpThread(id: number): Promise<Thread | null>;
  add(
    boardId: number,
    subject: string,
    name: string,
    tripcode: string,
    message: string,
    parsedMessage: Node[],
    ip: string,
    createdAt?: Date,
    bumpedAt?: Date
  ): Promise<Thread | null>;
  delete(id: number): Promise<Thread | null>;
}

export default IThreadRepository;
