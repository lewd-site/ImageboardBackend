import { Node } from './markup';
import Post from './post';
import IRepository from './repository';
import Thread from './thread';

export interface IPostRepository extends IRepository {
  browse(): Promise<Post[]>;
  browseForBoard(boardId: number): Promise<Post[]>;
  browseForThread(threadId: number): Promise<Post[]>;
  read(id: number): Promise<Post | null>;
  addPostReferences(post: Post): Promise<void>;
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
  updateMessage(id: number, message: string, parsedMessage: Node[]): Promise<void>;
  delete(id: number): Promise<Post | null>;
  loadLatestRepliesForThreads(threads: Thread[]): Promise<void>;
  loadLatestRepliesForThread(thread: Thread): Promise<void>;
  loadReferencesForPosts(posts: (Post | Thread)[]): Promise<void>;
  loadReferencesForPost(post: Post | Thread): Promise<void>;
}

export default IPostRepository;
