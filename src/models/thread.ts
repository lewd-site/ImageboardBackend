import { NotFoundError, ValidationError } from '../errors';
import Board from './board';
import IBoardRepository from './board-repository';
import File, { FileDto } from './file';
import IFileRepository from './file-repository';
import { IParser, ITokenizer, Node } from './markup';
import Post, { PostDto } from './post';
import IPostRepository from './post-repository';
import PostReference, { getPostReferenceData, PostReferenceDto } from './reference';
import IThreadRepository from './thread-repository';
import ITripcodeGenerator from './tripcode-generator';
import { FileInfo } from './types';

export interface ThreadDto {
  readonly id: number;
  readonly slug: string;
  readonly subject: string | null;
  readonly name: string | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly message_parsed: Node[];
  readonly files: FileDto[];
  readonly replies?: PostDto[];
  readonly references: PostReferenceDto[];
  readonly referenced_by: PostReferenceDto[];
  readonly created_at: string;
  readonly bumped_at: string;
  readonly post_count: number;
}

export class Thread {
  public static readonly MAX_SUBJECT_LENGTH = 40;
  public static readonly MAX_NAME_LENGTH = 40;
  public static readonly MAX_MESSAGE_LENGTH = 8000;
  public static readonly BUMP_LIMIT = 500;

  public readonly files: File[] = [];
  public readonly replies: Post[] = [];
  public readonly references: PostReference[] = [];
  public readonly referencedBy: PostReference[] = [];

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
    tripcodeGenerator: ITripcodeGenerator,
    tokenizer: ITokenizer,
    parser: IParser,
    name: string,
    message: string,
    files: FileInfo[],
    ip: string
  ): Promise<Post> {
    if (name.length > Thread.MAX_NAME_LENGTH) {
      throw new ValidationError('name', 'max-length');
    }

    if (!message.length && !files.length) {
      throw new ValidationError('message', 'required');
    }

    if (message.length > Thread.MAX_MESSAGE_LENGTH) {
      throw new ValidationError('message', 'max-length');
    }

    const author = tripcodeGenerator.createTripcode(name);
    const tokens = tokenizer.tokenize(message);
    const parsedMessage = await this.board.processParsedMessage(postRepository, parser.parse(tokens));

    let post: Post | null = null;

    try {
      await postRepository.begin();
      post = await postRepository.add(this.board.id, this.id, author.name, author.tripcode, message, parsedMessage, ip);
      if (post === null) {
        throw new Error("Can't create post");
      }

      await boardRepository.incrementPostCount(this.board.id);
      await threadRepository.incrementPostCount(this.id);
      // TODO: make bump limit configurable
      // if (this.postCount < Thread.BUMP_LIMIT) {
      await threadRepository.bumpThread(this.id);
      // }

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

    await fileRepository.loadForPost(post);

    return post;
  }

  public async deletePost(postRepository: IPostRepository, fileRepository: IFileRepository, id: number): Promise<Post> {
    let post = await postRepository.read(id);
    if (post === null || post.parentId !== this.id) {
      throw new NotFoundError('id');
    }

    post = await postRepository.delete(id);
    if (post === null) {
      throw new NotFoundError('id');
    }

    await fileRepository.loadForPost(post);

    return post;
  }

  public getData(): ThreadDto {
    return {
      id: +this.id,
      slug: this.board.slug,
      subject: this.subject,
      name: this.name,
      tripcode: this.tripcode,
      message: this.message,
      message_parsed: this.parsedMessage,
      files: this.files.map((file) => file.getData()),
      replies: this.replies.map((reply) => reply.getData()),
      references: this.references.map(getPostReferenceData),
      referenced_by: this.referencedBy.map(getPostReferenceData),
      created_at: this.createdAt.toISOString(),
      bumped_at: this.bumpedAt.toISOString(),
      post_count: +this.postCount,
    };
  }
}

export default Thread;
