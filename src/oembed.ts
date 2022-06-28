import fetch from 'cross-fetch';
import Embed, { EmbedDto } from './models/embed';
import IEmbedRepository from './models/embed-repository';

interface OEmbedResponse {
  readonly title: string;
  readonly author_name: string;
  readonly author_url: string;
  readonly type: string;
  readonly height: number;
  readonly width: number;
  readonly version: string;
  readonly provider_name: string;
  readonly provider_url: string;
  readonly thumbnail_height: number;
  readonly thumbnail_width: number;
  readonly thumbnail_url: string;
  readonly html: string;
}

interface OEmbedProvider {
  getEmbedInfo(url: string): Promise<EmbedDto | null>;
}

class YouTubeProvider implements OEmbedProvider {
  public async getEmbedInfo(url: string): Promise<EmbedDto | null> {
    if (
      !url.match(/^(?:https?\:\/\/)?(?:www\.)?(?:youtube\.com|m\.youtube\.com|youtu\.be|youtube-nocookie\.com)\/.+$/i)
    ) {
      return null;
    }

    const embedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&maxwidth=200&maxheight=200`;
    const response = await fetch(embedUrl);
    if (response.status >= 400) {
      return null;
    }

    const embed: OEmbedResponse = await response.json();

    return {
      type: 'video/x-youtube',
      url,
      name: embed.title,
      width: +embed.width,
      height: +embed.height,
      thumbnail_url: embed.thumbnail_url,
      thumbnail_width: +embed.thumbnail_width,
      thumbnail_height: +embed.thumbnail_height,
      created_at: new Date().toISOString(),
    };
  }
}

export class OEmbed {
  protected readonly repository: IEmbedRepository;
  protected readonly providers = [new YouTubeProvider()];

  public constructor(repository: IEmbedRepository) {
    this.repository = repository;
  }

  public async getEmbedInfo(url: string): Promise<Embed | null> {
    const embed = await this.repository.readByUrl(url);
    if (embed !== null) {
      return embed;
    }

    for (const provider of this.providers) {
      const result = await provider.getEmbedInfo(url);
      if (result !== null) {
        return await this.repository.readOrAdd(
          result.type,
          result.name,
          result.url,
          result.width,
          result.height,
          result.thumbnail_url,
          result.thumbnail_width,
          result.thumbnail_height,
          new Date(result.created_at)
        );
      }
    }

    return null;
  }
}

export default OEmbed;
