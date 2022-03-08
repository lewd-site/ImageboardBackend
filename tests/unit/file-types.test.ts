import path from 'path';
import { detectFileType } from '../../src/file-types';

test.each([
  [path.resolve(__dirname, '..', 'data', 'test.gif'), { extension: 'gif', mimeType: 'image/gif' }],
  [path.resolve(__dirname, '..', 'data', 'test.jpg'), { extension: 'jpg', mimeType: 'image/jpeg' }],
  [path.resolve(__dirname, '..', 'data', 'test.png'), { extension: 'png', mimeType: 'image/png' }],
  [path.resolve(__dirname, '..', 'data', 'test.webp'), { extension: 'webp', mimeType: 'image/webp' }],
])('detect file type', async (input, expected) => {
  // Act
  const result = await detectFileType(input);

  // Assert
  expect(result).toEqual(expected);
});
