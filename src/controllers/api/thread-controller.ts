import Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import Thread from '../../models/thread';
import IThreadRepository from '../../models/thread-repository';
import ITripcodeGenerator from '../../models/tripcode-generator';

interface ThreadDto {
  readonly id: number;
  readonly slug: string;
  readonly subject: string | null;
  readonly name: string | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly created_at: string;
  readonly bumped_at: string;
  readonly post_count: number;
}

export class ThreadController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly threadRepository: IThreadRepository,
    protected readonly tripcodeGenerator: ITripcodeGenerator
  ) {}

  public index = async (ctx: Koa.Context) => {
    const slug = String(ctx.params.slug || '').trim();
    if (slug.length) {
      const board = await this.boardRepository.readBySlug(slug);
      if (board === null) {
        throw new NotFoundError('slug');
      }

      const page = +(ctx.query.page || 0);
      const threads = await this.threadRepository.browseForBoard(board.id, page);
      return (ctx.body = { items: threads.map(this.convertModelToDto) });
    }

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

    const slug = String(ctx.params.slug || '').trim();
    if (slug.length) {
      const board = await this.boardRepository.readBySlug(slug);
      if (board === null || board.id !== thread.board.id) {
        throw new NotFoundError('slug');
      }
    }

    ctx.body = { item: this.convertModelToDto(thread) };
  };

  public create = async (ctx: Koa.Context) => {
    const slug = String(ctx.params.slug || ctx.request.body.slug || '').trim();
    const board = await this.boardRepository.readBySlug(slug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    const subject = String(ctx.request.body.subject || '');
    const name = String(ctx.request.body.name || '');
    const message = String(ctx.request.body.message || '');
    const ip = ctx.request.ip;
    const thread = await board.createThread(
      this.boardRepository,
      this.threadRepository,
      this.tripcodeGenerator,
      subject,
      name,
      message,
      ip
    );

    ctx.status = 201;
    ctx.set('Location', `/api/v1/boards/${board.slug}/threads/${thread.id}`);
    ctx.body = { item: this.convertModelToDto(thread) };
  };

  public delete = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    const thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    const slug = String(ctx.params.slug || thread.board.slug || '').trim();
    const board = await this.boardRepository.readBySlug(slug);
    if (board === null || board.id !== thread.board.id) {
      throw new NotFoundError('slug');
    }

    const deletedThread = await board.deleteThread(this.threadRepository, threadId);
    ctx.body = { item: this.convertModelToDto(deletedThread) };
  };

  protected convertModelToDto(thread: Thread): ThreadDto {
    return {
      id: +thread.id,
      slug: thread.board.slug,
      subject: thread.subject,
      name: thread.name,
      tripcode: thread.tripcode,
      message: thread.message,
      post_count: +thread.postCount,
      created_at: thread.createdAt.toISOString(),
      bumped_at: thread.bumpedAt.toISOString(),
    };
  }
}

export default ThreadController;
