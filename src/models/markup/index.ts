import Node from './node';
import Token from './token';

export interface ITokenizer {
  tokenize(text: string): Token[];
}

export interface IParser {
  parse(tokens: Token[]): Node[];
}

export * from './bb-code';
export * from './node';
export * from './style';
export * from './token';
