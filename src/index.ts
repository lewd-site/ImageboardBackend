import { readFile } from 'fs/promises';
import http from 'http';
import createApp, { registerScopedServices } from './app';
import config from './config';
import Container from './container';
import IBoardRepository from './models/board-repository';
import File from './models/file';
import IFileRepository from './models/file-repository';
import { Node } from './models/markup';
import Post from './models/post';
import IPostRepository from './models/post-repository';
import Thread from './models/thread';
import IThreadRepository from './models/thread-repository';
import registerServices, { BOARD_REPOSITORY, FILE_REPOSITORY, POST_REPOSITORY, THREAD_REPOSITORY } from './services';

interface ThreadDto {
  readonly id: number;
  readonly slug: string;
  readonly subject: string | null;
  readonly name: string | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly message_parsed: Node[];
  readonly files: FileDto[];
  readonly created_at: string;
  readonly bumped_at: string | null;
  readonly post_count: number;
  readonly ip: string;
  readonly posts: PostDto[];
}

interface PostDto {
  readonly id: number;
  readonly slug: string;
  readonly parent_id: number;
  readonly name: string | null;
  readonly tripcode: string | null;
  readonly message: string;
  readonly message_parsed: Node[];
  readonly files: FileDto[];
  readonly created_at: string;
  readonly post_count: number;
  readonly ip: string;
}

interface FileDto {
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
  readonly ip: string;
}

async function loadAllThreads(threadRepository: IThreadRepository) {
  const threads = [];

  let newThreads = [];
  let page = 0;
  do {
    newThreads = await threadRepository.browse(page++);
    threads.push(...newThreads);
  } while (newThreads.length);

  return threads;
}

function getThreadData(thread: Thread): ThreadDto {
  return {
    id: +thread.id,
    slug: thread.board.slug,
    subject: thread.subject,
    name: thread.name,
    tripcode: thread.tripcode,
    message: thread.message,
    message_parsed: thread.parsedMessage,
    files: thread.files.map(getFileData),
    created_at: thread.createdAt.toISOString(),
    bumped_at: thread.bumpedAt.toISOString(),
    post_count: +thread.postCount,
    ip: thread.ip,
    posts: [],
  };
}

function getPostData(post: Post): PostDto {
  return {
    id: +post.id,
    slug: post.board.slug,
    parent_id: +post.parentId,
    name: post.name,
    tripcode: post.tripcode,
    message: post.message,
    message_parsed: post.parsedMessage,
    files: post.files.map(getFileData),
    created_at: post.createdAt.toISOString(),
    post_count: 0,
    ip: post.ip,
  };
}

function getFileData(file: File): FileDto {
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
    ip: file.ip,
  };
}

async function exportPosts(
  threadRepository: IThreadRepository,
  postRepository: IPostRepository,
  fileRepository: IFileRepository
) {
  const threads = await loadAllThreads(threadRepository);
  await fileRepository.loadForPosts(threads);

  const threadsData = threads.map(getThreadData);
  for (const threadData of threadsData) {
    const posts = (await postRepository.browseForThread(threadData.id)).filter((post) => post.id !== threadData.id);
    await fileRepository.loadForPosts(threads);

    threadData.posts.push(...posts.map(getPostData));
  }

  console.log(JSON.stringify(threadsData));
}

async function importPosts(
  boardRepository: IBoardRepository,
  threadRepository: IThreadRepository,
  postRepository: IPostRepository,
  fileRepository: IFileRepository,
  threadsData: ThreadDto[]
) {
  for (const threadData of threadsData) {
    const board = await boardRepository.readBySlug(threadData.slug);
    if (!board) {
      console.log(`Board '${threadData.slug}' not found`);
      continue;
    }

    const thread = await threadRepository.add(
      board.id,
      threadData.subject || '',
      threadData.name || '',
      threadData.tripcode || '',
      threadData.message,
      threadData.message_parsed,
      threadData.ip,
      new Date(threadData.created_at),
      threadData.bumped_at !== null ? new Date() : undefined
    );

    for (const fileData of threadData.files) {
      await importFile(fileRepository, thread!.id, fileData);
    }

    for (const postData of threadData.posts) {
      await importPost(postRepository, fileRepository, board.id, thread!.id, postData);
    }
  }
}

async function importPost(
  postRepository: IPostRepository,
  fileRepository: IFileRepository,
  boardId: number,
  parentId: number,
  postData: PostDto
) {
  const post = await postRepository.add(
    boardId,
    parentId,
    postData.name || '',
    postData.tripcode || '',
    postData.message,
    postData.message_parsed,
    postData.ip,
    new Date(postData.created_at)
  );

  for (const fileData of postData.files) {
    await importFile(fileRepository, post!.id, fileData);
  }
}

async function importFile(fileRepository: IFileRepository, postId: number, fileData: FileDto) {
  const file = await fileRepository.readOrAdd(
    fileData.hash,
    fileData.name,
    fileData.extension,
    fileData.type,
    fileData.size,
    fileData.width,
    fileData.height,
    fileData.length,
    fileData.ip,
    new Date(fileData.created_at)
  );

  await fileRepository.addPostFileLink(postId, file!.id);
}

async function main() {
  const container = new Container();
  registerServices(container);

  if (process.argv.length > 2) {
    registerScopedServices(container);

    try {
      switch (process.argv[2]) {
        case 'export': {
          const threadRepository = await container.resolve<IThreadRepository>(THREAD_REPOSITORY);
          const postRepository = await container.resolve<IPostRepository>(POST_REPOSITORY);
          const fileRepository = await container.resolve<IFileRepository>(FILE_REPOSITORY);
          await exportPosts(threadRepository, postRepository, fileRepository);
          break;
        }

        case 'import': {
          if (process.argv.length < 3) {
            console.error('File name expected');
            return;
          }

          const boardRepository = await container.resolve<IBoardRepository>(BOARD_REPOSITORY);
          const threadRepository = await container.resolve<IThreadRepository>(THREAD_REPOSITORY);
          const postRepository = await container.resolve<IPostRepository>(POST_REPOSITORY);
          const fileRepository = await container.resolve<IFileRepository>(FILE_REPOSITORY);

          const data = await readFile(process.argv[3], 'utf8');
          const threads: ThreadDto[] = JSON.parse(data);
          await importPosts(boardRepository, threadRepository, postRepository, fileRepository, threads);
          break;
        }

        default:
          console.error(`Unknown command '${process.argv[2]}'`);
          break;
      }
    } finally {
      await container.dispose();
    }

    return;
  }

  const app = createApp(container);
  http.createServer(app.callback()).listen(config.http.port);
}

main();
