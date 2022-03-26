import { convertPostModelToDto } from '../controllers/api/types';
import { NotFoundError, ValidationError } from '../errors';
import Board from './board';
import IBoardRepository from './board-repository';
import File from './file';
import IFileRepository from './file-repository';
import { IParser, ITokenizer, Node } from './markup';
import Post from './post';
import IPostRepository from './post-repository';
import IQueue from './queue';
import IThreadRepository from './thread-repository';
import ITripcodeGenerator from './tripcode-generator';
import { FileInfo } from './types';

export class Thread {
  public static readonly MAX_NAME_LENGTH = 40;
  public static readonly MAX_MESSAGE_LENGTH = 8000;
  public static readonly BUMP_LIMIT = 500;

  public readonly files: File[] = [];

  public constructor(
    public readonly id: number,
    public readonly board: Board,
    public readonly subject: string | null,
    public readonly name: string | null,
    public readonly tripcode: string | null,
    public readonly message: string,
    public readonly parsedMessage: Node[],
    public readonly ip: string,
    public readonly postCount: number,
    public readonly createdAt: Date,
    public readonly bumpedAt: Date
  ) {}

  public async createPost(
    boardRepository: IBoardRepository,
    threadRepository: IThreadRepository,
    postRepository: IPostRepository,
    fileRepository: IFileRepository,
    queue: IQueue,
    tripcodeGenerator: ITripcodeGenerator,
    tokenizer: ITokenizer,
    parser: IParser,
    name: string,
    message: string,
    files: FileInfo[],
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
    const tokens = tokenizer.tokenize(message);
    const parsedMessage = parser.parse(tokens);

    let post: Post | null = null;

    try {
      await postRepository.begin();
      post = await postRepository.add(this.board.id, this.id, author.name, author.tripcode, message, parsedMessage, ip);
      if (post === null) {
        throw new Error("Can't create post");
      }

      await boardRepository.incrementPostCount(this.board.id);
      await threadRepository.incrementPostCount(this.id);
      if (this.postCount < Thread.BUMP_LIMIT) {
        await threadRepository.bumpThread(this.id);
      }

      for (const fileInfo of files) {
        const file = await fileRepository.readOrAdd(
          fileInfo.hash,
          fileInfo.originalName,
          fileInfo.extension,
          fileInfo.mimeType,
          fileInfo.size,
          fileInfo.width,
          fileInfo.height,
          fileInfo.length,
          ip
        );

        if (file === null) {
          throw new Error("Can't create file");
        }

        await fileRepository.addPostFileLink(post.id, file.id);
      }

      await postRepository.commit();
    } catch (err) {
      await postRepository.rollback();
      throw err;
    }

    queue.publish('post_created', convertPostModelToDto(post));

    return post;
  }

  public async deletePost(postRepository: IPostRepository, queue: IQueue, id: number): Promise<Post> {
    let post = await postRepository.read(id);
    if (post === null || post.parentId !== this.id) {
      throw new NotFoundError('id');
    }

    post = await postRepository.delete(id);
    if (post === null) {
      throw new NotFoundError('id');
    }

    queue.publish('post_deleted', convertPostModelToDto(post));

    return post;
  }
}

export default Thread;
