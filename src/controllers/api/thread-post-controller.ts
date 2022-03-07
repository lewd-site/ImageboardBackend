import * as Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import Post from '../../models/post';
import IPostRepository from '../../models/post-repository';
import IThreadRepository from '../../models/thread-repository';

interface PostDto {
  readonly id: number;
  readonly slug: string;
  readonly parent_id: number;
  readonly name: string;
  readonly message: string;
  readonly ip: string;
  readonly created_at: string;
}

export class ThreadPostController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly threadRepository: IThreadRepository,
    protected readonly postRepository: IPostRepository
  ) {}

  public index = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    const thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    const posts = await this.postRepository.browseForThread(threadId);
    ctx.body = { items: posts.map(this.convertModelToDto) };
  };

  public show = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    const thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    const id = +(ctx.params.id || 0);
    const post = await this.postRepository.read(id);
    if (post === null || (post.parentId !== thread.id && post.id !== thread.id)) {
      throw new NotFoundError('id');
    }

    ctx.body = { item: this.convertModelToDto(post) };
  };

  public create = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    const thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    const name = String(ctx.request.body.name || '');
    const message = String(ctx.request.body.message || '');
    const ip = ctx.request.ip;
    const post = await thread.createPost(this.boardRepository, this.postRepository, name, message, ip);

    ctx.status = 201;
    ctx.set('Location', `/api/v1/threads/${thread.id}/posts/${post.id}`);
    ctx.body = { item: this.convertModelToDto(post) };
  };

  public delete = async (ctx: Koa.Context) => {
    const threadId = +(ctx.params.threadId || 0);
    const thread = await this.threadRepository.read(threadId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    const id = +(ctx.params.id || 0);
    const post = await thread.deletePost(this.postRepository, id);
    ctx.body = { item: this.convertModelToDto(post) };
  };

  protected convertModelToDto(post: Post): PostDto {
    return {
      id: +post.id,
      slug: post.board.slug,
      parent_id: +post.parentId,
      name: post.name,
      message: post.message,
      ip: post.ip,
      created_at: post.createdAt.toISOString(),
    };
  }
}

export default ThreadPostController;
