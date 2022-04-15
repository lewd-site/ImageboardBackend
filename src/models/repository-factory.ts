import IBoardRepository from './board-repository';
import IFileRepository from './file-repository';
import IPostRepository from './post-repository';
import IThreadRepository from './thread-repository';

export interface IRepositoryFactory {
  createBoardRepository(): IBoardRepository;
  createThreadRepository(): IThreadRepository;
  createPostRepository(): IPostRepository;
  createFileRepository(): IFileRepository;
}

export default IRepositoryFactory;
