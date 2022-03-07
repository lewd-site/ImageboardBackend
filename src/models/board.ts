import { NotFoundError, ValidationError } from '../errors';
import IBoardRepository from './board-repository';
import Thread from './thread';
import IThreadRepository from './thread-repository';

export class Board {
  public static readonly MAX_SLUG_LENGTH = 20;
  public static readonly MAX_TITLE_LENGTH = 100;
  public static readonly SLUG_PATTERN = /^[0-9a-z_-]+$/;
  public static readonly RESERVED_NAMES = ['admin', 'api', 'dashboard', 'settings', 'sse', 'ws'];

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
    name: string,
    message: string,
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

    let thread: Thread | null = null;

    try {
      await threadRepository.begin();
      thread = await threadRepository.add(this.id, name, message, ip);
      await boardRepository.incrementPostCount(this.id);
      await threadRepository.commit();
    } catch (err) {
      await threadRepository.rollback();
      throw err;
    }

    if (thread === null) {
      throw new NotFoundError('id');
    }

    return thread;
  }

  public async deleteThread(threadRepository: IThreadRepository, threadId: number): Promise<Thread> {
    let thread = await threadRepository.read(threadId);
    if (thread === null || thread.board.id !== this.id) {
      throw new NotFoundError('threadId');
    }

    thread = await threadRepository.delete(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    return thread;
  }
}

export default Board;
