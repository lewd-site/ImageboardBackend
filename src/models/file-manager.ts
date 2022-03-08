import ffprobe from 'ffprobe';
import { existsSync } from 'fs';
import { mkdir, rename } from 'fs/promises';
import md5 from 'md5-file';
import config from '../config';
import { ValidationError } from '../errors';
import { detectFileType } from '../file-types';
import File from './file';
import { FileDimensions, FileInfo, UploadedFile } from './types';

const DEFAULT_MIME_TYPE = 'application/octet-stream';

export class FileManager {
  public validateFile = async (file: UploadedFile): Promise<FileInfo> => {
    if (file.size > File.MAX_SIZE) {
      throw new ValidationError('files', 'max-size');
    }

    if (file.mimeType !== DEFAULT_MIME_TYPE && !File.ALLOWED_FILE_TYPES.includes(file.mimeType)) {
      throw new ValidationError('files', 'mimetype');
    }

    const fileInfo = await detectFileType(file.path);
    if (fileInfo === null) {
      throw new ValidationError('files', 'mimetype');
    }

    const { extension, mimeType } = fileInfo;
    if (!File.ALLOWED_FILE_TYPES.includes(mimeType)) {
      throw new ValidationError('files', 'mimetype');
    }

    const { width, height, length } = await this.getFileDimensions(file.path);

    if (width !== null && width > File.MAX_WIDTH) {
      throw new ValidationError('file', 'max-width');
    }

    if (height !== null && height > File.MAX_HEIGHT) {
      throw new ValidationError('file', 'max-height');
    }

    return {
      ...file,
      hash: await md5(file.path),
      mimeType,
      extension,
      width,
      height,
      length,
    };
  };

  public validateFiles = (files: UploadedFile[]): Promise<FileInfo[]> => {
    return Promise.all(files.map(this.validateFile));
  };

  public moveFile = async (file: FileInfo): Promise<void> => {
    const uploadDir = 'public/original';
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadPath = `${uploadDir}/${file.hash}.${file.extension}`;
    await rename(file.path, uploadPath);
  };

  public moveFiles = async (files: FileInfo[]): Promise<void> => {
    await Promise.all(files.map(this.moveFile));
  };

  protected async getFileDimensions(path: string): Promise<FileDimensions> {
    let width: number | null = null;
    let height: number | null = null;
    let length: number | null = null;

    const ffprobeResult = await ffprobe(path, config.ffprobe);
    for (const stream of ffprobeResult.streams) {
      if (typeof stream.width !== 'undefined' && (width === null || width < stream.width)) {
        width = +stream.width;
      }

      if (typeof stream.height !== 'undefined' && (height === null || height < stream.height)) {
        height = +stream.height;
      }

      if (typeof stream.duration !== 'undefined' && (length === null || length < stream.duration)) {
        length = +stream.duration;
      }
    }

    return {
      width,
      height,
      length,
    };
  }
}
