import { Node } from './markup';
import Post from './post';
import IRepository from './repository';
import Thread from './thread';

export interface IPostRepository extends IRepository {
  browse(): Promise<Post[]>;
  browseForBoard(boardId: number): Promise<Post[]>;
  browseForThread(threadId: number): Promise<Post[]>;
  read(id: number): Promise<Post | null>;
  add(
    boardId: number,
    parentId: number,
    name: string,
    tripcode: string,
    message: string,
    parsedMessage: Node[],
    ip: string,
    createdAt?: Date
  ): Promise<Post | null>;
  delete(id: number): Promise<Post | null>;
  loadLatestRepliesForThreads(threads: Thread[]): Promise<void>;
  loadLatestRepliesForThread(thread: Thread): Promise<void>;
}

export default IPostRepository;
