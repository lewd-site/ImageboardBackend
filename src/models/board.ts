export class Board {
  public static readonly MAX_SLUG_LENGTH = 20;
  public static readonly MAX_TITLE_LENGTH = 100;
  public static readonly SLUG_PATTERN = /^[0-9a-z_-]+$/;
  public static readonly RESERVED_NAMES = ['admin', 'api', 'settings', 'sse', 'ws'];

  public constructor(
    public readonly id: number,
    public readonly slug: string,
    public readonly title: string,
    public readonly createdAt: Date,
    public readonly postCount: number
  ) {}
}

export default Board;
