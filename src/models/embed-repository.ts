import Embed from './embed';
import Post from './post';
import IRepository from './repository';
import Thread from './thread';

export interface IEmbedRepository extends IRepository {
  read(id: number): Promise<Embed | null>;
  readByUrl(url: string): Promise<Embed | null>;
  loadForPosts(posts: (Post | Thread)[]): Promise<void>;
  loadForPost(post: Post | Thread): Promise<void>;
  readOrAdd(
    type: string,
    name: string,
    url: string,
    width: number,
    height: number,
    thumbnailUrl: string,
    thumbnailWidth: number,
    thumbnailHeight: number,
    createdAt?: Date
  ): Promise<Embed | null>;
  addPostEmbedLink(postId: number, embedId: number): Promise<void>;
  delete(id: number): Promise<Embed | null>;
}

export default IEmbedRepository;
