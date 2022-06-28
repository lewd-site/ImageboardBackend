export interface EmbedDto {
  readonly type: string;
  readonly name: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly thumbnail_url: string;
  readonly thumbnail_width: number;
  readonly thumbnail_height: number;
  readonly created_at: string;
}

export class Embed {
  public constructor(
    public readonly id: number,
    public readonly type: string,
    public readonly name: string,
    public readonly url: string,
    public readonly width: number,
    public readonly height: number,
    public readonly thumbnailUrl: string,
    public readonly thumbnailWidth: number,
    public readonly thumbnailHeight: number,
    public readonly created_at: Date
  ) {}

  public getData(): EmbedDto {
    return {
      type: this.type,
      name: this.name,
      url: this.url,
      width: +this.width,
      height: +this.height,
      thumbnail_url: this.thumbnailUrl,
      thumbnail_width: +this.thumbnailWidth,
      thumbnail_height: +this.thumbnailHeight,
      created_at: this.created_at.toISOString(),
    };
  }
}

export default Embed;
