import { readFile } from 'fs/promises';
import http from 'http';
import createApp, { registerScopedServices } from './app';
import config from './config';
import Container from './container';
import Parser from './markup/parser';
import Tokenizer from './markup/tokenizer';
import Board from './models/board';
import IBoardRepository from './models/board-repository';
import File from './models/file';
import IFileRepository from './models/file-repository';
import { Node } from './models/markup';
import Post from './models/post';
import IPostRepository from './models/post-repository';
import Thread from './models/thread';
import IThreadRepository from './models/thread-repository';
import OEmbed from './oembed';
import registerServices, {
  BOARD_REPOSITORY,
  FILE_REPOSITORY,
  OEMBED,
  POST_REPOSITORY,
  THREAD_REPOSITORY,
} from './services';

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

type IdMap = { [key: number]: number };

const tokenizer = new Tokenizer();
const parser = new Parser();

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
    await fileRepository.loadForPosts(posts);

    threadData.posts.push(...posts.map(getPostData));
  }

  console.log(JSON.stringify(threadsData));
}

function isThreadData(postData: PostDto | ThreadDto): postData is ThreadDto {
  const parentId = (postData as any).parent_id;
  return typeof parentId === 'undefined' || parentId === null || parentId === 0;
}

async function importPosts(
  boardRepository: IBoardRepository,
  threadRepository: IThreadRepository,
  postRepository: IPostRepository,
  fileRepository: IFileRepository,
  oembed: OEmbed,
  threadsData: ThreadDto[]
) {
  const postsData: (PostDto | ThreadDto)[] = [...threadsData];
  for (const threadData of threadsData) {
    postsData.push(...threadData.posts);
    threadData.posts.splice(0);
  }

  postsData.sort((a, b) => a.id - b.id);

  const boardIds: Set<number> = new Set();
  const threadIdMap: IdMap = {};
  const postIdMap: IdMap = {};

  for (const postData of postsData) {
    const board = await boardRepository.readBySlug(postData.slug);
    if (board === null) {
      console.warn(`Board '${postData.slug}' not found`);
      continue;
    }

    if (isThreadData(postData)) {
      const thread = await importThread(
        threadRepository,
        postRepository,
        fileRepository,
        oembed,
        board,
        postData,
        postIdMap
      );
      threadIdMap[postData.id] = thread.id;
      postIdMap[postData.id] = thread.id;
    } else {
      const parentId = threadIdMap[postData.parent_id];
      const post = await importPost(postRepository, fileRepository, oembed, board, parentId, postData, postIdMap);
      postIdMap[postData.id] = post.id;
    }

    boardIds.add(board.id);
  }

  for (const boardId of boardIds) {
    await boardRepository.calculatePostCount(boardId);
  }

  for (const threadId of Object.values(threadIdMap)) {
    await threadRepository.calculatePostCount(threadId);
  }
}

async function importThread(
  threadRepository: IThreadRepository,
  postRepository: IPostRepository,
  fileRepository: IFileRepository,
  oembed: OEmbed,
  board: Board,
  threadData: ThreadDto,
  postIdMap: IdMap
) {
  let parsedMessage = threadData.message_parsed;
  if (!parsedMessage.length) {
    const tokens = tokenizer.tokenize(threadData.message);
    parsedMessage = await board.processParsedMessage(postRepository, oembed, parser.parse(tokens));
  }

  const thread = await threadRepository.add(
    board.id,
    threadData.subject || '',
    threadData.name || '',
    threadData.tripcode || '',
    updateRefLinksInRawMessage(threadData.message, postIdMap),
    updateRefLinksInParsedMessage(parsedMessage, postIdMap),
    threadData.ip,
    new Date(threadData.created_at),
    threadData.bumped_at !== null ? new Date(threadData.bumped_at) : undefined
  );

  if (thread === null) {
    throw new Error(`Can't create thread '${threadData.id}'`);
  }

  for (const fileData of threadData.files) {
    await importFile(fileRepository, thread.id, fileData);
  }

  return thread;
}

async function importPost(
  postRepository: IPostRepository,
  fileRepository: IFileRepository,
  oembed: OEmbed,
  board: Board,
  parentId: number,
  postData: PostDto,
  postIdMap: IdMap
) {
  let parsedMessage = postData.message_parsed;
  if (!parsedMessage.length) {
    const tokens = tokenizer.tokenize(postData.message);
    parsedMessage = await board.processParsedMessage(postRepository, oembed, parser.parse(tokens));
  }

  const post = await postRepository.add(
    board.id,
    parentId,
    postData.name || '',
    postData.tripcode || '',
    updateRefLinksInRawMessage(postData.message, postIdMap),
    updateRefLinksInParsedMessage(parsedMessage, postIdMap),
    postData.ip,
    new Date(postData.created_at)
  );

  if (post === null) {
    throw new Error(`Can't create post '${postData.id}'`);
  }

  for (const fileData of postData.files) {
    await importFile(fileRepository, post.id, fileData);
  }

  return post;
}

function updateRefLinksInRawMessage(message: string, postIdMap: IdMap): string {
  return message.replace(/>>(\d+)/gi, (_match, postID) => {
    return '>>' + (typeof postIdMap[+postID] !== 'undefined' ? postIdMap[+postID] : postID);
  });
}

function updateRefLinksInParsedMessage(nodes: Node[], postIdMap: IdMap): Node[] {
  return nodes.map((node) => {
    switch (node.type) {
      case 'reflink':
        const threadID =
          typeof node.threadID !== 'undefined' && typeof postIdMap[node.threadID] !== 'undefined'
            ? postIdMap[node.threadID]
            : node.threadID;

        const postID = typeof postIdMap[node.postID] !== 'undefined' ? postIdMap[node.postID] : node.postID;

        return { ...node, postID, threadID };

      case 'style':
        return { ...node, children: updateRefLinksInParsedMessage(node.children, postIdMap) };

      default:
        return node;
    }
  });
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

  if (file === null) {
    throw new Error(`Can't create file '${fileData.hash}'`);
  }

  await fileRepository.addPostFileLink(postId, file.id);

  return file;
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
          const oembed = await container.resolve<OEmbed>(OEMBED);

          const data = await readFile(process.argv[3], 'utf8');
          const threads: ThreadDto[] = JSON.parse(data);
          await importPosts(boardRepository, threadRepository, postRepository, fileRepository, oembed, threads);
          break;
        }

        case 'process-markup': {
          const postRepository = await container.resolve<IPostRepository>(POST_REPOSITORY);
          const oembed = await container.resolve<OEmbed>(OEMBED);
          const posts = await postRepository.browse();
          let index = 0;
          for (const post of posts) {
            const tokens = tokenizer.tokenize(post.message);
            const parsedMessage = await post.board.processParsedMessage(postRepository, oembed, parser.parse(tokens));
            await postRepository.updateMessage(post.id, post.message, parsedMessage);
            console.log(`${++index}/${posts.length}`);
          }

          break;
        }

        case 'process-references': {
          const postRepository = await container.resolve<IPostRepository>(POST_REPOSITORY);
          const posts = await postRepository.browse();
          let index = 0;
          for (const post of posts) {
            await postRepository.addPostReferences(post);
            console.log(`${++index}/${posts.length}`);
          }

          break;
        }

        case 'process-embeds': {
          const postRepository = await container.resolve<IPostRepository>(POST_REPOSITORY);
          const posts = await postRepository.browse();
          let index = 0;
          for (const post of posts) {
            await postRepository.addPostEmbeds(post);
            console.log(`${++index}/${posts.length}`);
          }

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
