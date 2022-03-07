import Post from './post';
import IRepository from './repository';

export interface IPostRepository extends IRepository {
  browse(): Promise<Post[]>;
  browseForThread(threadId: number): Promise<Post[]>;
  read(id: number): Promise<Post | null>;
  add(boardId: number, parentId: number, name: string, message: string, ip: string): Promise<Post | null>;
  delete(id: number): Promise<Post | null>;
}

export default IPostRepository;
