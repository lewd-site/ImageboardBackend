import { NotFoundError, ValidationError } from '../errors';
import IQueue from './queue';
import IBoardRepository from './board-repository';
import IFileRepository from './file-repository';
import { IParser, ITokenizer, Node } from './markup';
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

  public processParsedMessage(nodes: Node[]): Node[] {
    const result: Node[] = [];
    for (const node of nodes) {
      if (node.type === 'dice') {
        const diceResult: number[] = [];
        for (let i = 0; i < node.count; i++) {
          diceResult.push(1 + Math.floor(Math.random() * node.max));
        }

        result.push({ ...node, result: diceResult });
      } else if (typeof (node as any).children !== 'undefined') {
        const children = this.processParsedMessage((node as any).children);

        result.push({ ...node, children } as Node);
      } else {
        result.push(node);
      }
    }

    return result;
  }

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
    if (subject.length > Thread.MAX_SUBJECT_LENGTH) {
      throw new ValidationError('subject', 'max-length');
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

    if (!files.length) {
      throw new ValidationError('files', 'required');
    }

    const author = tripcodeGenerator.createTripcode(name);
    const tokens = tokenizer.tokenize(message);
    const parsedMessage = this.processParsedMessage(parser.parse(tokens));

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

    await fileRepository.loadForPost(thread);

    queue.publish('thread_created', thread.getData());

    return thread;
  }

  public async deleteThread(
    threadRepository: IThreadRepository,
    fileRepository: IFileRepository,
    queue: IQueue,
    threadId: number
  ): Promise<Thread> {
    let thread = await threadRepository.read(threadId);
    if (thread === null || thread.board.id !== this.id) {
      throw new NotFoundError('threadId');
    }

    thread = await threadRepository.delete(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    await fileRepository.loadForPost(thread);

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
