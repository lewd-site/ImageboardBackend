import { unlink } from 'fs/promises';
import Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import { FileManager } from '../../models/file-manager';
import IFileRepository from '../../models/file-repository';
import { IParser, ITokenizer } from '../../models/markup';
import IPostRepository from '../../models/post-repository';
import IThreadRepository from '../../models/thread-repository';
import ITripcodeGenerator from '../../models/tripcode-generator';
import { convertMulterFileToUploadedFile } from '../../models/types';
import IQueue from '../../models/queue';
import { fileExists } from '../../utils';

export class ThreadController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly threadRepository: IThreadRepository,
    protected readonly postRepository: IPostRepository,
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
      await this.postRepository.loadLatestRepliesForThreads(threads);
      await this.postRepository.loadReferencesForPosts(threads);

      const replies = threads.flatMap((thread) => thread.replies);
      await this.fileRepository.loadForPosts(replies);
      await this.postRepository.loadReferencesForPosts(replies);

      return (ctx.body = { items: threads.map((thread) => thread.getData()) });
    }

    const page = +(ctx.query.page || 0);
    const threads = await this.threadRepository.browse(page);
    await this.fileRepository.loadForPosts(threads);
    await this.postRepository.loadLatestRepliesForThreads(threads);
    await this.postRepository.loadReferencesForPosts(threads);

    const replies = threads.flatMap((thread) => thread.replies);
    await this.fileRepository.loadForPosts(replies);
    await this.postRepository.loadReferencesForPosts(replies);

    ctx.body = { items: threads.map((thread) => thread.getData()) };
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
    await this.postRepository.loadLatestRepliesForThread(thread);
    await this.postRepository.loadReferencesForPost(thread);

    await this.fileRepository.loadForPosts(thread.replies);
    await this.postRepository.loadReferencesForPosts(thread.replies);

    ctx.body = { item: thread.getData() };
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
        this.postRepository,
        this.fileRepository,
        this.tripcodeGenerator,
        this.tokenizer,
        this.parser,
        subject,
        name,
        message,
        files,
        ip
      );

      await this.fileManager.moveFiles(files);
      this.queue.publish('thread_created', thread.getData());

      const { redirect } = ctx.request.query;
      if (typeof redirect !== 'undefined') {
        ctx.status = 303;
        ctx.set('Location', redirect);
        return;
      }

      ctx.status = 201;
      ctx.set('Location', `/api/v1/boards/${board.slug}/threads/${thread.id}`);
      ctx.body = { item: thread.getData() };
    } finally {
      await Promise.all(
        uploadedFiles.map(async (file) => {
          if (await fileExists(file.path)) {
            return unlink(file.path);
          }
        })
      );
    }
  };

  public delete = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    let thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    const slug = String(ctx.params.slug || thread.board.slug || '').trim();
    const board = await this.boardRepository.readBySlug(slug);
    if (board === null || board.id !== thread.board.id) {
      throw new NotFoundError('slug');
    }

    thread = await board.deleteThread(this.threadRepository, this.fileRepository, threadId);
    this.queue.publish('thread_deleted', thread.getData());

    ctx.body = { item: thread.getData() };
  };
}

export default ThreadController;
