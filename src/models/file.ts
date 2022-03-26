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

export class File {
  public static readonly MAX_SIZE = 100 * 1024 * 1024;
  public static readonly MAX_WIDTH = 8 * 1024;
  public static readonly MAX_HEIGHT = 8 * 1024;
  public static readonly ALLOWED_FILE_TYPES = [
    'image/webp',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'video/webm',
    'video/mp4',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-flac',
    'audio/vnd.wave',
  ];
  public static readonly ALLOWED_THUMBNAIL_EXTENSIONS = ['webp', 'jpg', 'png'];

  public constructor(
    public readonly id: number,
    public readonly hash: string,
    public readonly name: string,
    public readonly extension: string,
    public readonly type: string,
    public readonly size: number,
    public readonly width: number | null,
    public readonly height: number | null,
    public readonly length: number | null,
    public readonly ip: string,
    public readonly createdAt: Date
  ) {}

  public getData(): FileDto {
    return {
      hash: this.hash,
      name: this.name,
      extension: this.extension,
      path: `original/${this.hash}.${this.extension}`,
      type: this.type,
      size: +this.size,
      width: this.width ? +this.width : null,
      height: this.height ? +this.height : null,
      length: this.length ? +this.length : null,
      created_at: this.createdAt.toISOString(),
    };
  }
}

export default File;
