import Board from '../../models/board';
import File from '../../models/file';
import { Node } from '../../models/markup';
import Post from '../../models/post';
import Thread from '../../models/thread';

export interface BoardDto {
  readonly slug: string;
  readonly title: string;
  readonly created_at: string;
  readonly post_count: number;
}

export interface ThreadDto {
  readonly id: number;
  readonly slug: string;
  readonly subject: string | null;
  readonly name: string | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly message_parsed: Node[];
  readonly files: FileDto[];
  readonly created_at: string;
  readonly bumped_at: string;
  readonly post_count: number;
}

export interface PostDto {
  readonly id: number;
  readonly slug: string;
  readonly parent_id: number;
  readonly name: string | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly message_parsed: Node[];
  readonly files: FileDto[];
  readonly created_at: string;
}

export interface FileDto {
  readonly hash: string;
  readonly name: string;
  readonly extension: string;
  readonly path: string;
  readonly type: string;
  readonly size: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly length: number | null;
  readonly created_at: string;
}

export function convertBoardModelToDto(board: Board): BoardDto {
  return {
    slug: board.slug,
    title: board.title,
    created_at: board.createdAt.toISOString(),
    post_count: +board.postCount,
  };
}

export function convertThreadModelToDto(thread: Thread): ThreadDto {
  return {
    id: +thread.id,
    slug: thread.board.slug,
    subject: thread.subject,
    name: thread.name,
    tripcode: thread.tripcode,
    message: thread.message,
    message_parsed: thread.parsedMessage,
    files: thread.files.map(convertFileModelToDto),
    created_at: thread.createdAt.toISOString(),
    bumped_at: thread.bumpedAt.toISOString(),
    post_count: +thread.postCount,
  };
}

export function convertPostModelToDto(post: Post): PostDto {
  return {
    id: +post.id,
    slug: post.board.slug,
    parent_id: +post.parentId,
    name: post.name,
    tripcode: post.tripcode,
    message: post.message,
    message_parsed: post.parsedMessage,
    files: post.files.map(convertFileModelToDto),
    created_at: post.createdAt.toISOString(),
  };
}

export function convertFileModelToDto(file: File): FileDto {
  return {
    hash: file.hash,
    name: file.name,
    extension: file.extension,
    path: `original/${file.hash}.${file.extension}`,
    type: file.type,
    size: +file.size,
    width: file.width ? +file.width : null,
    height: file.height ? +file.height : null,
    length: file.length ? +file.length : null,
    created_at: file.createdAt.toISOString(),
  };
}
