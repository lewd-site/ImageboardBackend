import Parser from '../../../src/markup/parser';
import { Node } from '../../../src/models/markup';

test('parse empty', () => {
  // Arrange
  const parser = new Parser();

  // Act
  const nodes = parser.parse([]);

  // Assert
  const expected: Node[] = [];
  expect(nodes).toEqual(expected);
});

test('parse text', () => {
  // Arrange
  const parser = new Parser();

  // Act
  const nodes = parser.parse([{ type: 'text', index: 0, text: 'Hello world!' }]);

  // Assert
  const expected: Node[] = [{ type: 'text', text: 'Hello world!' }];
  expect(nodes).toEqual(expected);
});

test('parse bbcode', () => {
  // Arrange
  const parser = new Parser();

  // Act
  const nodes = parser.parse([
    { type: 'text', index: 0, text: 'Hello ' },
    { type: 'bb_start', index: 1, text: '[b]', tag: 'b' },
    { type: 'text', index: 2, text: 'brutally' },
    { type: 'bb_end', index: 3, text: '[/b]', tag: 'b' },
    { type: 'text', index: 4, text: ' ' },
    { type: 'bb_start', index: 5, text: '[i]', tag: 'i' },
    { type: 'text', index: 6, text: 'cruel' },
    { type: 'bb_end', index: 7, text: '[/i]', tag: 'i' },
    { type: 'text', index: 8, text: ' world!' },
  ]);

  // Assert
  const expected: Node[] = [
    { type: 'text', text: 'Hello ' },
    { type: 'style', style: 'bold', value: undefined, children: [{ type: 'text', text: 'brutally' }] },
    { type: 'text', text: ' ' },
    { type: 'style', style: 'italic', value: undefined, children: [{ type: 'text', text: 'cruel' }] },
    { type: 'text', text: ' world!' },
  ];

  expect(nodes).toEqual(expected);
});

test('parse nested bbcodes', () => {
  // Arrange
  const parser = new Parser();

  // Act
  const nodes = parser.parse([
    { type: 'text', index: 0, text: 'Hello ' },
    { type: 'bb_start', index: 1, text: '[b]', tag: 'b' },
    { type: 'text', index: 2, text: 'brutally' },
    { type: 'bb_start', index: 3, text: '[i]', tag: 'i' },
    { type: 'text', index: 4, text: ' ' },
    { type: 'bb_end', index: 5, text: '[/i]', tag: 'i' },
    { type: 'text', index: 6, text: 'cruel' },
    { type: 'bb_end', index: 7, text: '[/b]', tag: 'b' },
    { type: 'text', index: 8, text: ' world!' },
  ]);

  // Assert
  const expected: Node[] = [
    { type: 'text', text: 'Hello ' },
    {
      type: 'style',
      style: 'bold',
      value: undefined,
      children: [
        { type: 'text', text: 'brutally' },
        { type: 'style', style: 'italic', value: undefined, children: [{ type: 'text', text: ' ' }] },
        { type: 'text', text: 'cruel' },
      ],
    },
    { type: 'text', text: ' world!' },
  ];

  expect(nodes).toEqual(expected);
});

test('parse overlapping bbcodes', () => {
  // Arrange
  const parser = new Parser();

  // Act
  const nodes = parser.parse([
    { type: 'text', index: 0, text: 'Hello ' },
    { type: 'bb_start', index: 1, text: '[b]', tag: 'b' },
    { type: 'text', index: 2, text: 'brutally' },
    { type: 'bb_start', index: 3, text: '[i]', tag: 'i' },
    { type: 'text', index: 4, text: ' ' },
    { type: 'bb_end', index: 5, text: '[/b]', tag: 'b' },
    { type: 'text', index: 6, text: 'cruel' },
    { type: 'bb_end', index: 7, text: '[/i]', tag: 'i' },
    { type: 'text', index: 8, text: ' world!' },
  ]);

  // Assert
  const expected: Node[] = [
    { type: 'text', text: 'Hello ' },
    {
      type: 'style',
      style: 'bold',
      value: undefined,
      children: [
        { type: 'text', text: 'brutally' },
        { type: 'style', style: 'italic', value: undefined, children: [{ type: 'text', text: ' ' }] },
      ],
    },
    { type: 'style', style: 'italic', value: undefined, children: [{ type: 'text', text: 'cruel' }] },
    { type: 'text', text: ' world!' },
  ];

  expect(nodes).toEqual(expected);
});
