import * as Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import Thread from '../../models/thread';
import IThreadRepository from '../../models/thread-repository';

interface ThreadDto {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly message: string;
  readonly created_at: string;
  readonly bumped_at: string;
  readonly post_count: number;
}

export class ThreadController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly threadRepository: IThreadRepository
  ) {}

  public index = async (ctx: Koa.Context) => {
    const page = +(ctx.query.page || 0);
    const threads = await this.threadRepository.browse(page);
    ctx.body = { items: threads.map(this.convertModelToDto) };
  };

  public show = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    const thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    ctx.body = { item: this.convertModelToDto(thread) };
  };

  public create = async (ctx: Koa.Context) => {
    const slug = String(ctx.request.body.slug || '').trim();
    const board = await this.boardRepository.readBySlug(slug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    const name = String(ctx.request.body.name || '');
    const message = String(ctx.request.body.message || '');
    const ip = ctx.request.ip;
    const thread = await board.createThread(this.boardRepository, this.threadRepository, name, message, ip);

    ctx.status = 201;
    ctx.set('Location', `/api/v1/threads/${thread.id}`);
    ctx.body = { item: this.convertModelToDto(thread) };
  };

  public delete = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    let thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    const board = await this.boardRepository.read(thread.board.id);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    thread = await board.deleteThread(this.threadRepository, threadId);
    ctx.body = { item: this.convertModelToDto(thread) };
  };

  protected convertModelToDto(thread: Thread): ThreadDto {
    return {
      id: +thread.id,
      slug: thread.board.slug,
      name: thread.name,
      message: thread.message,
      created_at: thread.createdAt.toISOString(),
      bumped_at: thread.bumpedAt.toISOString(),
      post_count: +thread.postCount,
    };
  }
}

export default ThreadController;
