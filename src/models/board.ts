import { NotFoundError, ValidationError } from '../errors';
import IQueue from './queue';
import IBoardRepository from './board-repository';
import IFileRepository from './file-repository';
import { IParser, ITokenizer } from './markup';
import Thread from './thread';
import IThreadRepository from './thread-repository';
import ITripcodeGenerator from './tripcode-generator';
import { FileInfo } from './types';

export interface BoardDto {
  readonly slug: string;
  readonly title: string;
  readonly created_at: string;
  readonly post_count: number;
}

export class Board {
  public static readonly MAX_SLUG_LENGTH = 20;
  public static readonly MAX_TITLE_LENGTH = 100;
  public static readonly SLUG_PATTERN = /^[0-9a-z_-]+$/;
  public static readonly RESERVED_NAMES = [
    'admin',
    'api',
    'dashboard',
    'original',
    'settings',
    'sse',
    'thumbnails',
    'ws',
  ];

  public constructor(
    public readonly id: number,
    public readonly slug: string,
    public readonly title: string,
    public readonly createdAt: Date,
    public readonly postCount: number
  ) {}

  public async createThread(
    boardRepository: IBoardRepository,
    threadRepository: IThreadRepository,
    fileRepository: IFileRepository,
    queue: IQueue,
    tripcodeGenerator: ITripcodeGenerator,
    tokenizer: ITokenizer,
    parser: IParser,
    subject: string,
    name: string,
    message: string,
    files: FileInfo[],
    ip: string
  ): Promise<Thread> {
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

    let thread: Thread | null = null;

    try {
      await threadRepository.begin();
      thread = await threadRepository.add(this.id, subject, author.name, author.tripcode, message, parsedMessage, ip);
      if (thread === null) {
        throw new Error("Can't create thread");
      }

      await boardRepository.incrementPostCount(this.id);

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

        await fileRepository.addPostFileLink(thread.id, file.id);
      }

      await threadRepository.commit();
    } catch (err) {
      await threadRepository.rollback();
      throw err;
    }

    queue.publish('thread_created', thread.getData());

    return thread;
  }

  public async deleteThread(threadRepository: IThreadRepository, queue: IQueue, threadId: number): Promise<Thread> {
    let thread = await threadRepository.read(threadId);
    if (thread === null || thread.board.id !== this.id) {
      throw new NotFoundError('threadId');
    }

    thread = await threadRepository.delete(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    queue.publish('thread_deleted', thread.getData());

    return thread;
  }

  public getData(): BoardDto {
    return {
      slug: this.slug,
      title: this.title,
      created_at: this.createdAt.toISOString(),
      post_count: +this.postCount,
    };
  }
}

export default Board;
