import { ClientBase } from 'pg';
import IFileRepository from '../../models/file-repository';
import IPostRepository from '../../models/post-repository';
import IRepositoryFactory from '../../models/repository-factory';
import PgsqlBoardRepository from './board-repository';
import PgsqlFileRepository from './file-repository';
import PgsqlPostAttributesRepository from './post-attributes-repository';
import PgsqlPostRepository from './post-repository';
import PgsqlThreadRepository from './thread-repository';

export class PgsqlRepositoryFactory implements IRepositoryFactory {
  public constructor(protected readonly client: ClientBase) {}

  public createBoardRepository() {
    return new PgsqlBoardRepository(this.client);
  }

  public createThreadRepository() {
    const postAttributesRepository = this.createPostAttributesRepository();

    return new PgsqlThreadRepository(this.client, postAttributesRepository);
  }

  public createPostRepository(): IPostRepository {
    const postAttributesRepository = this.createPostAttributesRepository();

    return new PgsqlPostRepository(this.client, postAttributesRepository);
  }

  public createFileRepository(): IFileRepository {
    const postAttributesRepository = this.createPostAttributesRepository();

    return new PgsqlFileRepository(this.client, postAttributesRepository);
  }

  protected createPostAttributesRepository() {
    return new PgsqlPostAttributesRepository(this.client);
  }
}

export default PgsqlRepositoryFactory;
