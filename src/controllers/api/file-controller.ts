import { createReadStream } from 'fs';
import Koa from 'koa';
import { NotFoundError } from '../../errors';
import { getMimeTypeByExtension } from '../../file-types';
import File from '../../models/file';
import FileManager from '../../models/file-manager';
import IFileRepository from '../../models/file-repository';

const DEFAULT_MIMETYPE = 'application/octet-stream';

const thumbnails: { [key: string]: Promise<string> } = {};

export class FileController {
  public constructor(protected readonly fileRepository: IFileRepository, protected readonly fileManager: FileManager) {}

  public createThumbnail = async (ctx: Koa.Context) => {
    const input = String(ctx.params.hash || '');
    const inputParts = input.split('.');
    if (inputParts.length !== 2) {
      throw new NotFoundError('hash');
    }

    const [hash, extension] = inputParts;
    if (!File.ALLOWED_THUMBNAIL_EXTENSIONS.includes(extension)) {
      throw new NotFoundError('hash');
    }

    const file = await this.fileRepository.readByHash(hash);
    if (file === null) {
      throw new NotFoundError('hash');
    }

    const key = `${file.hash}_${extension}`;
    if (typeof thumbnails[key] !== 'undefined') {
      const path = await thumbnails[key];
      ctx.set('Content-Type', getMimeTypeByExtension(extension) || DEFAULT_MIMETYPE);
      ctx.body = createReadStream(path);
      return;
    }

    try {
      const path = await (thumbnails[key] = this.fileManager.createThumbnail(file, extension));
      ctx.set('Content-Type', getMimeTypeByExtension(extension) || DEFAULT_MIMETYPE);
      ctx.body = createReadStream(path);
    } finally {
      delete thumbnails[key];
    }
  };
}

export default FileController;
