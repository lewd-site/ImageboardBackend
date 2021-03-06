import Koa from 'koa';
import { NotFoundError } from '../../errors';
import BoardManager from '../../models/board-manager';
import IBoardRepository from '../../models/board-repository';
import IQueue from '../../models/queue';

export class BoardController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly queue: IQueue,
    protected readonly boardManager: BoardManager
  ) {}

  public index = async (ctx: Koa.Context) => {
    const page = +(ctx.query.page || 0);
    const boards = await this.boardRepository.browse(page);
    ctx.body = { items: boards.map((board) => board.getData()) };
  };

  public show = async (ctx: Koa.Context) => {
    const slug = String(ctx.params.slug || '').trim();
    const board = await this.boardRepository.readBySlug(slug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    ctx.body = { item: board.getData() };
  };

  public create = async (ctx: Koa.Context) => {
    const slug = String(ctx.request.body.slug || '').trim();
    const title = String(ctx.request.body.title || '').trim();
    const board = await this.boardManager.createBoard(this.boardRepository, slug, title);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    this.queue.publish('board_created', board.getData());

    ctx.status = 201;
    ctx.set('Location', `/api/v1/boards/${board.slug}`);
    ctx.body = { item: board.getData() };
  };

  public update = async (ctx: Koa.Context) => {
    const oldSlug = String(ctx.params.slug || '').trim();
    const slug = String(ctx.request.body.slug || '').trim();
    const title = String(ctx.request.body.title || '').trim();
    const board = await this.boardManager.updateBoard(this.boardRepository, oldSlug, slug, title);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    this.queue.publish('board_updated', board.getData());

    ctx.body = { item: board.getData() };
  };

  public delete = async (ctx: Koa.Context) => {
    const slug = String(ctx.params.slug || '').trim();
    const board = await this.boardManager.deleteBoard(this.boardRepository, slug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    this.queue.publish('board_deleted', board.getData());

    ctx.body = { item: board.getData() };
  };
}

export default BoardController;
