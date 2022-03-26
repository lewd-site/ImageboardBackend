import { convertBoardModelToDto } from '../controllers/api/types';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import IQueue from './queue';
import Board from './board';
import IBoardRepository from './board-repository';

export class BoardManager {
  public async createBoard(repository: IBoardRepository, queue: IQueue, slug: string, title: string): Promise<Board> {
    if (!slug.length) {
      throw new ValidationError('slug', 'required');
    }

    if (slug.length > Board.MAX_SLUG_LENGTH) {
      throw new ValidationError('slug', 'max-length');
    }

    if (slug.match(Board.SLUG_PATTERN) === null) {
      throw new ValidationError('slug', 'pattern');
    }

    if (!title.length) {
      throw new ValidationError('title', 'required');
    }

    if (slug.length > Board.MAX_TITLE_LENGTH) {
      throw new ValidationError('title', 'max-length');
    }

    if (Board.RESERVED_NAMES.indexOf(slug) !== -1) {
      throw new ConflictError('slug');
    }

    const existingBoard = await repository.readBySlug(slug);
    if (existingBoard !== null) {
      throw new ConflictError('slug');
    }

    const board = await repository.add(slug, title);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    queue.publish('board_created', convertBoardModelToDto(board));

    return board;
  }

  public async updateBoard(
    repository: IBoardRepository,
    queue: IQueue,
    oldSlug: string,
    slug: string,
    title: string
  ): Promise<Board> {
    if (!slug.length) {
      throw new ValidationError('slug', 'required');
    }

    if (slug.length > Board.MAX_SLUG_LENGTH) {
      throw new ValidationError('slug', 'max-length');
    }

    if (slug.match(Board.SLUG_PATTERN) === null) {
      throw new ValidationError('slug', 'pattern');
    }

    if (!title.length) {
      throw new ValidationError('title', 'required');
    }

    if (slug.length > Board.MAX_TITLE_LENGTH) {
      throw new ValidationError('title', 'max-length');
    }

    if (Board.RESERVED_NAMES.indexOf(slug) !== -1) {
      throw new ConflictError('slug');
    }

    let board = await repository.readBySlug(oldSlug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    board = await repository.edit(board.id, slug, title);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    queue.publish('board_updated', convertBoardModelToDto(board));

    return board;
  }

  public async deleteBoard(repository: IBoardRepository, queue: IQueue, slug: string): Promise<Board> {
    let board = await repository.readBySlug(slug);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    board = await repository.delete(board.id);
    if (board === null) {
      throw new NotFoundError('slug');
    }

    queue.publish('board_deleted', convertBoardModelToDto(board));

    return board;
  }
}

export default BoardManager;
