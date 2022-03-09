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
}

export default File;
