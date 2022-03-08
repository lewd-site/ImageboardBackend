import { Style } from './style';

interface TextNode {
  readonly type: 'text';
  readonly text: string;
}

interface NewLineNode {
  readonly type: 'newline';
}

interface RefLinkNode {
  readonly type: 'reflink';
  readonly postID: number;
  readonly threadID?: number;
}

interface LinkNode {
  readonly type: 'link';
  readonly text: string;
  readonly url: string;
  readonly icon?: string;
}

interface StyleNode {
  readonly type: 'style';
  readonly style: Style;
  readonly value?: string;
  readonly children: Node[];
}

export type Node = TextNode | NewLineNode | RefLinkNode | LinkNode | StyleNode;

export default Node;
