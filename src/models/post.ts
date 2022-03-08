import Board from './board';
import File from './file';
import { Node } from './markup';

export class Post {
  public static readonly MAX_NAME_LENGTH = 40;
  public static readonly MAX_MESSAGE_LENGTH = 8000;

  public readonly files: File[] = [];

  public constructor(
    public readonly id: number,
    public readonly board: Board,
    public readonly parentId: number,
    public readonly name: string | null,
    public readonly tripcode: string | null,
    public readonly message: string,
    public readonly parsedMessage: Node[],
    public readonly ip: string,
    public readonly createdAt: Date
  ) {}
}

export default Post;
