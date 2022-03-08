import Tokenizer from '../../../src/markup/tokenizer';
import { Token } from '../../../src/models/markup';

test('tokenize empty string', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('');

  // Assert
  const expected: Token[] = [];
  expect(tokens).toEqual(expected);
});

test('tokenize text', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('Hello world!');

  // Assert
  const expected: Token[] = [{ type: 'text', index: 0, text: 'Hello world!' }];
  expect(tokens).toEqual(expected);
});

test('tokenize text with new line', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('Hello\nworld!');

  // Assert
  const expected: Token[] = [
    { type: 'text', index: 0, text: 'Hello' },
    { type: 'newline', index: 1, text: '\n' },
    { type: 'text', index: 2, text: 'world!' },
  ];
  expect(tokens).toEqual(expected);
});

test('tokenize quote', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('> Hello world!');

  // Assert
  const expected: Token[] = [{ type: 'quote', index: 0, text: '> Hello world!', quote: ' Hello world!' }];
  expect(tokens).toEqual(expected);
});

test('tokenize link', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('https://google.com');

  // Assert
  const expected: Token[] = [{ type: 'link', index: 0, text: 'https://google.com', url: 'https://google.com' }];
  expect(tokens).toEqual(expected);
});

test('tokenize link with query and path', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('https://www.youtube.com/watch?v=PEKkdIT8JPM&t=102s');

  // Assert
  const expected: Token[] = [
    {
      type: 'link',
      index: 0,
      text: 'https://www.youtube.com/watch?v=PEKkdIT8JPM&t=102s',
      url: 'https://www.youtube.com/watch?v=PEKkdIT8JPM&t=102s',
    },
  ];
  expect(tokens).toEqual(expected);
});

test('tokenize reflink', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('>>83');

  // Assert
  const expected: Token[] = [{ type: 'reflink', index: 0, text: '>>83', postID: 83 }];
  expect(tokens).toEqual(expected);
});

test('tokenize wakabamark', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('Hello %%brutally cruel%% world!');

  // Assert
  const expected: Token[] = [
    { type: 'text', index: 0, text: 'Hello ' },
    { type: 'wm_start', index: 1, text: '%%' },
    { type: 'text', index: 2, text: 'brutally cruel' },
    { type: 'wm_end', index: 3, text: '%%' },
    { type: 'text', index: 4, text: ' world!' },
  ];
  expect(tokens).toEqual(expected);
});

test('tokenize bbcode', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('Hello [b]brutally[/b] [i]cruel[/i] world!');

  // Assert
  const expected: Token[] = [
    { type: 'text', index: 0, text: 'Hello ' },
    { type: 'bb_start', index: 1, text: '[b]', tag: 'b' },
    { type: 'text', index: 2, text: 'brutally' },
    { type: 'bb_end', index: 3, text: '[/b]', tag: 'b' },
    { type: 'text', index: 4, text: ' ' },
    { type: 'bb_start', index: 5, text: '[i]', tag: 'i' },
    { type: 'text', index: 6, text: 'cruel' },
    { type: 'bb_end', index: 7, text: '[/i]', tag: 'i' },
    { type: 'text', index: 8, text: ' world!' },
  ];
  expect(tokens).toEqual(expected);
});

test('tokenize bbcode with value', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('Hello [color=#f00]brutally cruel[/color] world!');

  // Assert
  const expected: Token[] = [
    { type: 'text', index: 0, text: 'Hello ' },
    { type: 'bb_start', index: 1, text: '[color=#f00]', tag: 'color', value: '#f00' },
    { type: 'text', index: 2, text: 'brutally cruel' },
    { type: 'bb_end', index: 3, text: '[/color]', tag: 'color' },
    { type: 'text', index: 4, text: ' world!' },
  ];
  expect(tokens).toEqual(expected);
});

test('tokenize unpaired bbcode as text', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('Hello [b]brutally cruel[/i] world!');

  // Assert
  const expected: Token[] = [{ type: 'text', index: 0, text: 'Hello [b]brutally cruel[/i] world!' }];
  expect(tokens).toEqual(expected);
});

test('tokenize code', () => {
  // Arrange
  const tokenizer = new Tokenizer();

  // Act
  const tokens = tokenizer.tokenize('Hello [code]brutally[i] [/i]cruel[/code] world!');

  // Assert
  const expected: Token[] = [
    { type: 'text', index: 0, text: 'Hello ' },
    { type: 'bb_start', index: 1, text: '[code]', tag: 'code' },
    { type: 'text', index: 2, text: 'brutally[i] [/i]cruel' },
    { type: 'bb_end', index: 3, text: '[/code]', tag: 'code' },
    { type: 'text', index: 4, text: ' world!' },
  ];
  expect(tokens).toEqual(expected);
});
