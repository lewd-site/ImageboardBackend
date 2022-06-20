import { unlink } from 'fs/promises';
import Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import FileManager from '../../models/file-manager';
import IFileRepository from '../../models/file-repository';
import { IParser, ITokenizer } from '../../models/markup';
import IPostRepository from '../../models/post-repository';
import IThreadRepository from '../../models/thread-repository';
import ITripcodeGenerator from '../../models/tripcode-generator';
import { convertMulterFileToUploadedFile } from '../../models/types';
import IQueue from '../../models/queue';
import { fileExists } from '../../utils';

export class PostController {
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
    const threadId = +(ctx.params.threadId || 0);
    if (threadId !== 0) {
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

      const posts = await this.postRepository.browseForThread(threadId);
      await this.fileRepository.loadForPosts(posts);
      await this.postRepository.loadReferencesForPosts(posts);

      return (ctx.body = { items: posts.map((post) => post.getData()) });
    }

    const slug = String(ctx.params.slug || '').trim();
    if (slug.length) {
      const board = await this.boardRepository.readBySlug(slug);
      if (board === null) {
        throw new NotFoundError('slug');
      }

      const posts = await this.postRepository.browseForBoard(board.id);
      await this.fileRepository.loadForPosts(posts);
      await this.postRepository.loadReferencesForPosts(posts);

      return (ctx.body = { items: posts.map((post) => post.getData()) });
    }

    const posts = await this.postRepository.browse();
    await this.fileRepository.loadForPosts(posts);
    await this.postRepository.loadReferencesForPosts(posts);

    ctx.body = { items: posts.map((post) => post.getData()) };
  };

  public show = async (ctx: Koa.Context) => {
    const id = +(ctx.params.id || 0);
    const post = await this.postRepository.read(id);
    if (post === null) {
      throw new NotFoundError('id');
    }

    const threadId = +(ctx.params.threadId || 0);
    if (threadId !== 0) {
      const thread = await this.threadRepository.read(threadId);
      if (thread === null || thread.id !== post.parentId) {
        throw new NotFoundError('threadId');
      }
    }

    const slug = String(ctx.params.slug || '').trim();
    if (slug.length) {
      const board = await this.boardRepository.readBySlug(slug);
      if (board === null || board.id !== post.board.id) {
        throw new NotFoundError('slug');
      }
    }

    await this.fileRepository.loadForPost(post);
    await this.postRepository.loadReferencesForPost(post);

    ctx.body = { item: post.getData() };
  };

  public create = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || ctx.request.body.parentId || 0);
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
      const post = await thread.createPost(
        this.boardRepository,
        this.threadRepository,
        this.postRepository,
        this.fileRepository,
        this.tripcodeGenerator,
        this.tokenizer,
        this.parser,
        name,
        message,
        files,
        ip
      );

      await this.fileManager.moveFiles(files);
      this.queue.publish('post_created', post.getData());

      const { redirect } = ctx.request.query;
      if (typeof redirect !== 'undefined') {
        ctx.status = 303;
        ctx.set('Location', redirect);
        return;
      }

      ctx.status = 201;
      ctx.set('Location', `/api/v1/boards/${thread.board.slug}/threads/${thread.id}/posts/${post.id}`);
      ctx.body = { item: post.getData() };
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
    const id = +(ctx.params.id || 0);
    let post = await this.postRepository.read(id);
    if (post === null) {
      throw new NotFoundError('id');
    }

    const threadId = +(ctx.params.threadId || post.parentId || 0);
    const thread = await this.threadRepository.read(threadId);
    if (thread === null || thread.id !== post.parentId) {
      throw new NotFoundError('threadId');
    }

    const slug = String(ctx.params.slug || '').trim();
    if (slug.length) {
      const board = await this.boardRepository.readBySlug(slug);
      if (board === null || board.id !== post.board.id) {
        throw new NotFoundError('slug');
      }
    }

    post = await thread.deletePost(this.postRepository, this.fileRepository, id);
    this.queue.publish('post_deleted', post.getData());

    ctx.body = { item: post.getData() };
  };
}

export default PostController;
