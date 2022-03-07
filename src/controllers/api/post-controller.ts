import Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import Post from '../../models/post';
import IPostRepository from '../../models/post-repository';
import IThreadRepository from '../../models/thread-repository';
import ITripcodeGenerator from '../../models/tripcode-generator';

interface PostDto {
  readonly id: number;
  readonly slug: string;
  readonly parent_id: number;
  readonly name: string | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly created_at: string;
}

export class PostController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly threadRepository: IThreadRepository,
    protected readonly postRepository: IPostRepository,
    protected readonly tripcodeGenerator: ITripcodeGenerator
  ) {}

  public index = async (ctx: Koa.Context) => {
    const posts = await this.postRepository.browse();
    ctx.body = { items: posts.map(this.convertModelToDto) };
  };

  public show = async (ctx: Koa.Context) => {
    const id = +(ctx.params.id || 0);
    const post = await this.postRepository.read(id);
    if (post === null) {
      throw new NotFoundError('id');
    }

    ctx.body = { item: this.convertModelToDto(post) };
  };

  public create = async (ctx: Koa.Context) => {
    const parentId = +(ctx.request.body.parentId || 0);
    const thread = await this.threadRepository.read(parentId);
    if (thread === null) {
      throw new NotFoundError('parentId');
    }

    const name = String(ctx.request.body.name || '');
    const message = String(ctx.request.body.message || '');
    const ip = ctx.request.ip;
    const post = await thread.createPost(
      this.boardRepository,
      this.threadRepository,
      this.postRepository,
      this.tripcodeGenerator,
      name,
      message,
      ip
    );

    ctx.status = 201;
    ctx.set('Location', `/api/v1/posts/${post.id}`);
    ctx.body = { item: this.convertModelToDto(post) };
  };

  public delete = async (ctx: Koa.Context) => {
    const id = +(ctx.params.id || 0);
    let post = await this.postRepository.read(id);
    if (post === null) {
      throw new NotFoundError('id');
    }

    const thread = await this.threadRepository.read(post.parentId);
    if (thread === null) {
      throw new NotFoundError('threadId');
    }

    post = await thread.deletePost(this.postRepository, id);
    ctx.body = { item: this.convertModelToDto(post) };
  };

  protected convertModelToDto(post: Post): PostDto {
    return {
      id: +post.id,
      slug: post.board.slug,
      parent_id: +post.parentId,
      name: post.name,
      tripcode: post.tripcode,
      message: post.message,
      created_at: post.createdAt.toISOString(),
    };
  }
}

export default PostController;
