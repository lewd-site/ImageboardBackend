import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import { FileManager } from '../../models/file-manager';
import IFileRepository from '../../models/file-repository';
import { IParser, ITokenizer } from '../../models/markup';
import IThreadRepository from '../../models/thread-repository';
import ITripcodeGenerator from '../../models/tripcode-generator';
import { convertMulterFileToUploadedFile } from '../../models/types';
import IQueue from '../../models/queue';
import { convertThreadModelToDto } from './types';

export class ThreadController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly threadRepository: IThreadRepository,
    protected readonly fileRepository: IFileRepository,
    protected readonly queue: IQueue,
    protected readonly tripcodeGenerator: ITripcodeGenerator,
    protected readonly tokenizer: ITokenizer,
    protected readonly parser: IParser,
    protected readonly fileManager: FileManager
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
      await this.fileRepository.loadForPosts(threads);

      return (ctx.body = { items: threads.map(convertThreadModelToDto) });
    }

    const page = +(ctx.query.page || 0);
    const threads = await this.threadRepository.browse(page);
    await this.fileRepository.loadForPosts(threads);

    ctx.body = { items: threads.map(convertThreadModelToDto) };
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

    await this.fileRepository.loadForPost(thread);

    ctx.body = { item: convertThreadModelToDto(thread) };
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

    const multerFiles =
      typeof ctx.files !== 'undefined' && !Array.isArray(ctx.files)
        ? typeof ctx.files['files'] !== 'undefined'
          ? ctx.files['files']
          : []
        : [];

    const uploadedFiles = multerFiles.map(convertMulterFileToUploadedFile);
    try {
      const files = await this.fileManager.validateFiles(uploadedFiles);
      const ip = ctx.request.ip;
      const thread = await board.createThread(
        this.boardRepository,
        this.threadRepository,
        this.fileRepository,
        this.queue,
        this.tripcodeGenerator,
        this.tokenizer,
        this.parser,
        subject,
        name,
        message,
        files,
        ip
      );

      await this.fileRepository.loadForPost(thread);
      await this.fileManager.moveFiles(files);

      ctx.status = 201;
      ctx.set('Location', `/api/v1/boards/${board.slug}/threads/${thread.id}`);
      ctx.body = { item: convertThreadModelToDto(thread) };
    } finally {
      await Promise.all(
        uploadedFiles.map((file) => {
          if (existsSync(file.path)) {
            return unlink(file.path);
          }
        })
      );
    }
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

    await this.fileRepository.loadForPost(thread);
    await board.deleteThread(this.threadRepository, this.queue, threadId);

    ctx.body = { item: convertThreadModelToDto(thread) };
  };
}

export default ThreadController;
