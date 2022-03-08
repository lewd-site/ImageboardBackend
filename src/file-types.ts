import { open } from 'fs/promises';

interface Signature {
  readonly position: number;
  readonly buffer: Buffer;
}

interface FileType {
  readonly signatures: Signature[];
  readonly ext: string;
  readonly mime: string;
}

interface Result {
  readonly extension: string;
  readonly mimeType: string;
}

const fileTypes: FileType[] = [
  {
    signatures: [
      { position: 0, buffer: Buffer.from([0x52, 0x49, 0x46, 0x46]) },
      { position: 8, buffer: Buffer.from([0x57, 0x45, 0x42, 0x50]) },
    ],
    ext: 'webp',
    mime: 'image/webp',
  },
  {
    signatures: [
      { position: 0, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]) },
    ],
    ext: 'jpg',
    mime: 'image/jpeg',
  },
  {
    signatures: [
      { position: 0, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe1]) },
      { position: 6, buffer: Buffer.from([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]) },
    ],
    ext: 'jpg',
    mime: 'image/jpeg',
  },
  { signatures: [{ position: 0, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe2]) }], ext: 'jpg', mime: 'image/jpeg' },
  { signatures: [{ position: 0, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe3]) }], ext: 'jpg', mime: 'image/jpeg' },
  { signatures: [{ position: 0, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xee]) }], ext: 'jpg', mime: 'image/jpeg' },
  { signatures: [{ position: 0, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]) }], ext: 'jpg', mime: 'image/jpeg' },
  {
    signatures: [{ position: 0, buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
    ext: 'png',
    mime: 'image/png',
  },
  {
    signatures: [{ position: 0, buffer: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) }],
    ext: 'gif',
    mime: 'image/gif',
  },
  {
    signatures: [{ position: 0, buffer: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) }],
    ext: 'gif',
    mime: 'image/gif',
  },
  { signatures: [{ position: 0, buffer: Buffer.from([0x42, 0x4d]) }], ext: 'bmp', mime: 'image/bmp' },
  { signatures: [{ position: 0, buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]) }], ext: 'webm', mime: 'video/webm' },
  {
    signatures: [{ position: 4, buffer: Buffer.from([0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]) }],
    ext: 'mp4',
    mime: 'video/mp4',
  },
  { signatures: [{ position: 0, buffer: Buffer.from([0xff, 0xfb]) }], ext: 'mp3', mime: 'audio/mpeg' },
  { signatures: [{ position: 0, buffer: Buffer.from([0xff, 0xf3]) }], ext: 'mp3', mime: 'audio/mpeg' },
  { signatures: [{ position: 0, buffer: Buffer.from([0xff, 0xf2]) }], ext: 'mp3', mime: 'audio/mpeg' },
  { signatures: [{ position: 0, buffer: Buffer.from([0x49, 0x44, 0x33]) }], ext: 'mp3', mime: 'audio/mpeg' },
  { signatures: [{ position: 0, buffer: Buffer.from([0x66, 0x4c, 0x61, 0x43]) }], ext: 'flac', mime: 'audio/x-flac' },
  {
    signatures: [
      { position: 0, buffer: Buffer.from([0x52, 0x49, 0x46, 0x46]) },
      { position: 8, buffer: Buffer.from([0x57, 0x41, 0x56, 0x45]) },
    ],
    ext: 'mp3',
    mime: 'audio/vnd.wave',
  },
];

export async function detectFileType(path: string): Promise<Result | null> {
  const file = await open(path, 'r');
  const { buffer } = await file.read({ length: 12 });
  file.close();

  for (const fileType of fileTypes) {
    let matched = true;
    for (const signature of fileType.signatures) {
      if (!buffer.slice(signature.position, signature.position + signature.buffer.length).equals(signature.buffer)) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { extension: fileType.ext, mimeType: fileType.mime };
    }
  }

  return null;
}
