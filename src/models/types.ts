import { File } from '@koa/multer';

export interface UploadedFile {
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly path: string;
}

export interface FileDimensions {
  readonly width: number | null;
  readonly height: number | null;
  readonly length: number | null;
}

export type FileInfo = UploadedFile & FileDimensions & { readonly hash: string; readonly extension: string };

export function convertMulterFileToUploadedFile(file: File): UploadedFile {
  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
  };
}
