import File from './file';
import Post from './post';
import IRepository from './repository';
import Thread from './thread';

export interface IFileRepository extends IRepository {
  read(id: number): Promise<File | null>;
  readByHash(hash: string): Promise<File | null>;
  loadForPosts(posts: (Post | Thread)[]): Promise<void>;
  loadForPost(post: Post | Thread): Promise<void>;
  readOrAdd(
    hash: string,
    name: string,
    extension: string,
    type: string,
    size: number,
    width: number | null,
    height: number | null,
    length: number | null,
    ip: string
  ): Promise<File | null>;
  addPostFileLink(postId: number, fileId: number): Promise<void>;
  delete(id: number): Promise<File | null>;
}

export default IFileRepository;
