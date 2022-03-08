import Koa from 'koa';
import { NotFoundError } from '../../errors';
import IBoardRepository from '../../models/board-repository';
import { IParser, ITokenizer, Node } from '../../models/markup';
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
  readonly message_parsed: Node[];
  readonly created_at: string;
}

export class PostController {
  public constructor(
    protected readonly boardRepository: IBoardRepository,
    protected readonly threadRepository: IThreadRepository,
    protected readonly postRepository: IPostRepository,
    protected readonly tripcodeGenerator: ITripcodeGenerator,
    protected readonly tokenizer: ITokenizer,
    protected readonly parser: IParser
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
      return (ctx.body = { items: posts.map(this.convertModelToDto) });
    }

    const slug = String(ctx.params.slug || '').trim();
    if (slug.length) {
      const board = await this.boardRepository.readBySlug(slug);
      if (board === null) {
        throw new NotFoundError('slug');
      }
    }

    const posts = await this.postRepository.browse();
    ctx.body = { items: posts.map(this.convertModelToDto) };
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

    ctx.body = { item: this.convertModelToDto(post) };
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
    const ip = ctx.request.ip;
    const post = await thread.createPost(
      this.boardRepository,
      this.threadRepository,
      this.postRepository,
      this.tripcodeGenerator,
      this.tokenizer,
      this.parser,
      name,
      message,
      ip
    );

    ctx.status = 201;
    ctx.set('Location', `/api/v1/boards/${thread.board.slug}/threads/${thread.id}/posts/${post.id}`);
    ctx.body = { item: this.convertModelToDto(post) };
  };

  public delete = async (ctx: Koa.Context) => {
    const id = +(ctx.params.id || 0);
    const post = await this.postRepository.read(id);
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

    const deletedPost = await thread.deletePost(this.postRepository, id);
    ctx.body = { item: this.convertModelToDto(deletedPost) };
  };

  protected convertModelToDto(post: Post): PostDto {
    return {
      id: +post.id,
      slug: post.board.slug,
      parent_id: +post.parentId,
      name: post.name,
      tripcode: post.tripcode,
      message: post.message,
      message_parsed: post.parsedMessage,
      created_at: post.createdAt.toISOString(),
    };
  }
}

export default PostController;
