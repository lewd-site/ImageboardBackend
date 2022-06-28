import Embed from '../../models/embed';
import IEmbedRepository from '../../models/embed-repository';
import Post from '../../models/post';
import Thread from '../../models/thread';
import PgsqlRepository from './repository';

interface EmbedDto {
  readonly id: number;
  readonly type: string;
  readonly name: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly thumbnail_url: string;
  readonly thumbnail_width: number;
  readonly thumbnail_height: number;
  readonly created_at: Date;
}

export class PgsqlEmbedRepository extends PgsqlRepository implements IEmbedRepository {
  public async read(id: number): Promise<Embed | null> {
    const sql = `SELECT * FROM embeds
      WHERE id = $1
      ORDER BY id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [id]);
    if (result.rowCount === 0) {
      return null;
    }

    return this.convertDtoToModel(result.rows[0]);
  }

  public async readByUrl(url: string): Promise<Embed | null> {
    const sql = `SELECT * FROM embeds
      WHERE url = $1
      ORDER BY id DESC
      LIMIT 1`;

    const result = await this.client.query(sql, [url]);
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
    const sql = `SELECT e.*, pe.post_id FROM embeds e
      INNER JOIN posts_embeds pe ON pe.embed_id = e.id
      WHERE pe.post_id IN (${postIds.join(',')})
      ORDER BY pe.post_id, e.id`;

    const { rows } = await this.client.query(sql);
    for (const row of rows) {
      const embed = this.convertDtoToModel(row);
      postsMap[row.post_id].embeds.push(embed);
    }
  }

  public loadForPost(post: Post | Thread): Promise<void> {
    return this.loadForPosts([post]);
  }

  public async readOrAdd(
    type: string,
    name: string,
    url: string,
    width: number,
    height: number,
    thumbnailUrl: string,
    thumbnailWidth: number,
    thumbnailHeight: number,
    createdAt?: Date
  ): Promise<Embed | null> {
    const embed = await this.readByUrl(url);
    if (embed !== null) {
      return embed;
    }

    const createdAtValue = typeof createdAt !== 'undefined' ? '$9' : 'now()';
    const sql = `INSERT INTO embeds (type, name, url, width, height, thumbnail_url, thumbnail_width, thumbnail_height, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${createdAtValue})
      RETURNING id`;

    const params = [type, name, url, width, height, thumbnailUrl, thumbnailWidth, thumbnailHeight];
    if (typeof createdAt !== 'undefined') {
      params.push(createdAt.toISOString());
    }

    const result = await this.client.query(sql, params);
    return this.read(+result.rows[0].id);
  }

  public async addPostEmbedLink(postId: number, embedId: number): Promise<void> {
    const sql = `INSERT INTO posts_embeds (post_id, embed_id)
      VALUES ($1, $2) ON CONFLICT DO NOTHING`;

    await this.client.query(sql, [postId, embedId]);
  }

  public async delete(id: number): Promise<Embed | null> {
    const embed = await this.read(id);
    if (embed === null) {
      return null;
    }

    const sql = `DELETE FROM embeds WHERE id = $1`;
    await this.client.query(sql, [id]);
    return embed;
  }

  protected convertDtoToModel(dto: EmbedDto): Embed {
    return new Embed(
      +dto.id,
      dto.type,
      dto.name,
      dto.url,
      dto.width,
      dto.height,
      dto.thumbnail_url,
      dto.thumbnail_width,
      dto.thumbnail_height,
      dto.created_at
    );
  }
}

export default PgsqlEmbedRepository;
