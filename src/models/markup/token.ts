import BBCodeTag from './bb-code';

interface TokenBase {
  readonly text: string;
  readonly index: number;
}

export type TextToken = TokenBase & {
  readonly type: 'text';
};

export type NewLineToken = TokenBase & {
  readonly type: 'newline';
};

export type QuoteToken = TokenBase & {
  readonly type: 'quote';
  readonly quote: string;
};

export type LinkToken = TokenBase & {
  readonly type: 'link';
  readonly url: string;
  readonly icon?: string;
};

export type RefLinkToken = TokenBase & {
  readonly type: 'reflink';
  readonly postID: number;
  readonly threadID?: number;
};

export type WakabamarkStartToken = TokenBase & {
  readonly type: 'wm_start';
};

export type WakabamarkEndToken = TokenBase & {
  readonly type: 'wm_end';
};

export type BBCodeStartToken = TokenBase & {
  readonly type: 'bb_start';
  readonly tag: BBCodeTag;
  readonly value?: string;
};

export type BBCodeEndToken = TokenBase & {
  readonly type: 'bb_end';
  readonly tag: BBCodeTag;
};

export type Token =
  | TextToken
  | NewLineToken
  | QuoteToken
  | LinkToken
  | RefLinkToken
  | WakabamarkStartToken
  | WakabamarkEndToken
  | BBCodeStartToken
  | BBCodeEndToken;

export default Token;
