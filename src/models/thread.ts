import { NotFoundError, ValidationError } from '../errors';
import Board from './board';
import IBoardRepository from './board-repository';
import Post from './post';
import IPostRepository from './post-repository';
import IThreadRepository from './thread-repository';
import ITripcodeGenerator from './tripcode-generator';

export class Thread {
  public static readonly MAX_NAME_LENGTH = 40;
  public static readonly MAX_MESSAGE_LENGTH = 8000;
  public static readonly BUMP_LIMIT = 500;

  public constructor(
    public readonly id: number,
    public readonly board: Board,
    public readonly subject: string | null,
    public readonly name: string | null,
    public readonly tripcode: string | null,
    public readonly message: string,
    public readonly ip: string,
    public readonly postCount: number,
    public readonly createdAt: Date,
    public readonly bumpedAt: Date
  ) {}

  public async createPost(
    boardRepository: IBoardRepository,
    threadRepository: IThreadRepository,
    postRepository: IPostRepository,
    tripcodeGenerator: ITripcodeGenerator,
    name: string,
    message: string,
    ip: string
  ): Promise<Post> {
    if (!name.length) {
      throw new ValidationError('name', 'required');
    }

    if (name.length > Thread.MAX_NAME_LENGTH) {
      throw new ValidationError('name', 'max-length');
    }

    if (!message.length) {
      throw new ValidationError('message', 'required');
    }

    if (message.length > Thread.MAX_MESSAGE_LENGTH) {
      throw new ValidationError('message', 'max-length');
    }

    const author = tripcodeGenerator.createTripcode(name);

    let post: Post | null = null;

    try {
      await postRepository.begin();
      post = await postRepository.add(this.board.id, this.id, author.name, author.tripcode, message, ip);
      await boardRepository.incrementPostCount(this.board.id);
      await threadRepository.incrementPostCount(this.id);
      if (this.postCount < Thread.BUMP_LIMIT) {
        await threadRepository.bumpThread(this.id);
      }

      await postRepository.commit();
    } catch (err) {
      await postRepository.rollback();
      throw err;
    }

    if (post === null) {
      throw new NotFoundError('id');
    }

    return post;
  }

  public async deletePost(postRepository: IPostRepository, id: number): Promise<Post> {
    let post = await postRepository.read(id);
    if (post === null || post.parentId !== this.id) {
      throw new NotFoundError('id');
    }

    post = await postRepository.delete(id);
    if (post === null) {
      throw new NotFoundError('id');
    }

    return post;
  }
}

export default Thread;
