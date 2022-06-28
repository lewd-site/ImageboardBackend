import { ClientBase } from 'pg';
import File from '../../models/file';
import IFileRepository from '../../models/file-repository';
import Post from '../../models/post';
import Thread from '../../models/thread';
import PgsqlPostAttributesRepository from './post-attributes-repository';
import PgsqlRepository from './repository';

interface FileDto {
  readonly id: number;
  readonly hash: string;
  readonly name: string;
  readonly extension: string;
  readonly type: string;
  readonly size: number;
  readonly width: number | null;
  readonly length: number | null;
  readonly height: number | null;
  readonly ip_id: number;
  readonly ip: string;
  readonly created_at: Date;
}

export class PgsqlFileRepository extends PgsqlRepository implements IFileRepository {
  public constructor(client: ClientBase, protected readonly postAttributesRepository: PgsqlPostAttributesRepository) {
    super(client);
  }

  public async read(id: number): Promise<File | null> {
    const sql = `SELECT f.*, i.ip FROM files f
      INNER JOIN ips i ON i.id = f.ip_id
      WHERE f.id = $1
      ORDER BY f.id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [id]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.convertDtoToModel(result.rows[0]);
  }

  public async readByHash(hash: string): Promise<File | null> {
    const sql = `SELECT f.*, i.ip FROM files f
      INNER JOIN ips i ON i.id = f.ip_id
      WHERE f.hash = $1
      ORDER BY f.id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [hash]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.convertDtoToModel(result.rows[0]);
  }

  public async loadForPosts(posts: (Post | Thread)[]): Promise<void> {
    if (!posts.length) {
      return;
    }

    const postsMap: { [id: number]: Post | Thread } = {};
    for (const post of posts) {
      postsMap[post.id] = post;
    }

    const postIds = posts.map((post) => post.id);
    const sql = `SELECT f.*, i.ip, pf.post_id FROM files f
      INNER JOIN ips i ON i.id = f.ip_id
      INNER JOIN posts_files pf ON pf.file_id = f.id
      WHERE pf.post_id IN (${postIds.join(',')})
      ORDER BY pf.post_id, f.id`;

    const { rows } = await this.client.query(sql);
    for (const row of rows) {
      const file = this.convertDtoToModel(row);
      postsMap[row.post_id].files.push(file);
    }
  }

  public loadForPost(post: Post | Thread): Promise<void> {
    return this.loadForPosts([post]);
  }

  public async readOrAdd(
    hash: string,
    name: string,
    extension: string,
    type: string,
    size: number,
    width: number | null,
    height: number | null,
    length: number | null,
    ip: string,
    createdAt?: Date
  ): Promise<File | null> {
    const file = await this.readByHash(hash);
    if (file !== null) {
      return file;
    }

    const createdAtValue = typeof createdAt !== 'undefined' ? '$10' : 'now()';
    const sql = `INSERT INTO files (hash, name, extension, type, size, width, height, length, ip_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${createdAtValue})
      RETURNING id`;

    const params = [
      hash,
      name,
      extension,
      type,
      size,
      width,
      height,
      length,
      await this.postAttributesRepository.readOrAddIp(ip),
    ];

    if (typeof createdAt !== 'undefined') {
      params.push(createdAt.toISOString());
    }

    const result = await this.client.query(sql, params);
    return this.read(+result.rows[0].id);
  }

  public async addPostFileLink(postId: number, fileId: number): Promise<void> {
    const sql = `INSERT INTO posts_files (post_id, file_id)
      VALUES ($1, $2)`;

    await this.client.query(sql, [postId, fileId]);
  }

  public async delete(id: number): Promise<File | null> {
    const file = await this.read(id);
    if (file === null) {
      return null;
    }

    const sql = `DELETE FROM files WHERE id = $1`;
    await this.client.query(sql, [id]);
    return file;
  }

  protected convertDtoToModel(dto: FileDto): File {
    return new File(
      +dto.id,
      dto.hash,
      dto.name,
      dto.extension,
      dto.type,
      dto.size,
      dto.width,
      dto.height,
      dto.length,
      dto.ip,
      dto.created_at
    );
  }
}

export default PgsqlFileRepository;
