import ffprobe from 'ffprobe';
import { existsSync } from 'fs';
import { mkdir, rename } from 'fs/promises';
import md5 from 'md5-file';
import mv from 'mv';
import path from 'path';
import config from '../config';
import { ValidationError } from '../errors';
import { detectFileType } from '../file-types';
import { Thumbnailer } from '../thumbnailer';
import File from './file';
import { FileDimensions, FileInfo, UploadedFile } from './types';

const DEFAULT_MIME_TYPE = 'application/octet-stream';
const UPLOAD_DIR = 'public/original';
const THUMBNAIL_DIR = 'public/thumbnails';
const THUMBNAIL_SIZE = 250;

export class FileManager {
  public constructor(protected readonly thumbnailer: Thumbnailer) {}

  public validateFiles = (files: UploadedFile[]): Promise<FileInfo[]> => {
    return Promise.all(files.map(this.validateFile));
  };

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

  public moveFiles = async (files: FileInfo[]): Promise<void> => {
    await Promise.all(files.map(this.moveFile));
  };

  public moveFile = (file: FileInfo): Promise<void> => {
    const uploadPath = path.resolve(UPLOAD_DIR, `${file.hash}.${file.extension}`);
    return new Promise((resolve, reject) => {
      mv(file.path, uploadPath, { mkdirp: true }, (err) => {
        if (err !== null) {
          reject(err);
        }

        resolve();
      });
    });
  };

  public createThumbnail = async (file: File, extension: string): Promise<string> => {
    let source = path.resolve(UPLOAD_DIR, `${file.hash}.${file.extension}`);
    const destination = path.resolve(THUMBNAIL_DIR, `${file.hash}.${extension}`);

    if (!existsSync(THUMBNAIL_DIR)) {
      await mkdir(THUMBNAIL_DIR, { recursive: true });
    }

    if (existsSync(destination)) {
      return destination;
    }

    if (file.width === null && file.height === null) {
      if (file.type.startsWith('audio/')) {
        source = path.resolve(__dirname, '..', 'static', 'icons8-musical-notes-96.png');
      } else {
        source = path.resolve(__dirname, '..', 'static', 'icons8-cancel-96.png');
      }
    }

    await this.thumbnailer.createThumbnail(source, destination, THUMBNAIL_SIZE);

    return destination;
  };
}
