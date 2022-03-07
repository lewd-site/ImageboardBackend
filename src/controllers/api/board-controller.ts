import Koa from 'koa';
import { NotFoundError } from '../../errors';
import Board from '../../models/board';
import BoardManager from '../../models/board-manager';
import IBoardRepository from '../../models/board-repository';

interface BoardDto {
  readonly slug: string;
  readonly title: string;
  readonly created_at: string;
  readonly post_count: number;
}

export class BoardController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly boardManager: BoardManager
  ) {}

  public index = async (ctx: Koa.Context) => {
    const page = +(ctx.query.page || 0);
    const boards = await this.boardRepository.browse(page);
    ctx.body = { items: boards.map(this.convertModelToDto) };
  };

  public show = async (ctx: Koa.Context) => {
    const slug = String(ctx.params.slug || '').trim();
    const board = await this.boardRepository.readBySlug(slug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    ctx.body = { item: this.convertModelToDto(board) };
  };

  public create = async (ctx: Koa.Context) => {
    const slug = String(ctx.request.body.slug || '').trim();
    const title = String(ctx.request.body.title || '').trim();
    const board = await this.boardManager.createBoard(this.boardRepository, slug, title);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    ctx.status = 201;
    ctx.set('Location', `/api/v1/boards/${board.slug}`);
    ctx.body = { item: this.convertModelToDto(board) };
  };

  public update = async (ctx: Koa.Context) => {
    const oldSlug = String(ctx.params.slug || '').trim();
    const slug = String(ctx.request.body.slug || '').trim();
    const title = String(ctx.request.body.title || '').trim();
    const board = await this.boardManager.updateBoard(this.boardRepository, oldSlug, slug, title);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    ctx.body = { item: this.convertModelToDto(board) };
  };

  public delete = async (ctx: Koa.Context) => {
    const slug = String(ctx.params.slug || '').trim();
    const board = await this.boardManager.deleteBoard(this.boardRepository, slug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    ctx.body = { item: this.convertModelToDto(board) };
  };

  protected convertModelToDto(board: Board): BoardDto {
    return {
      slug: board.slug,
      title: board.title,
      created_at: board.createdAt.toISOString(),
      post_count: +board.postCount,
    };
  }
}

export default BoardController;
