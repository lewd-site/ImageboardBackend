import { ClientBase } from 'pg';
import IEmbedRepository from '../../models/embed-repository';
import IFileRepository from '../../models/file-repository';
import IPostRepository from '../../models/post-repository';
import IRepositoryFactory from '../../models/repository-factory';
import PgsqlBoardRepository from './board-repository';
import PgsqlEmbedRepository from './embed-repository';
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
    const embedRepository = this.createEmbedRepository();

    return new PgsqlThreadRepository(this.client, postAttributesRepository, embedRepository);
  }

  public createPostRepository(): IPostRepository {
    const postAttributesRepository = this.createPostAttributesRepository();
    const embedRepository = this.createEmbedRepository();

    return new PgsqlPostRepository(this.client, postAttributesRepository, embedRepository);
  }

  public createFileRepository(): IFileRepository {
    const postAttributesRepository = this.createPostAttributesRepository();

    return new PgsqlFileRepository(this.client, postAttributesRepository);
  }

  public createEmbedRepository(): IEmbedRepository {
    return new PgsqlEmbedRepository(this.client);
  }

  protected createPostAttributesRepository() {
    return new PgsqlPostAttributesRepository(this.client);
  }
}

export default PgsqlRepositoryFactory;
