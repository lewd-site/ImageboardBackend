import { spawn } from 'child_process';
import config from './config';
import { NotFoundError } from './errors';
import { fileExists } from './utils';

export class Thumbnailer {
  public async createThumbnail(source: string, destination: string, size: number): Promise<void> {
    if (!(await fileExists(source))) {
      throw new NotFoundError('hash');
    }

    const args = [
      '-loglevel error',
      '-hide_banner',
      '-nostats',
      '-y',
      `-i "${source.replace('"', '\\"')}"`,
      '-ss 00:00:00',
      `-vf "scale='min(${size},iw)':'min(${size},ih):force_original_aspect_ratio=decrease'"`,
      '-vframes 1',
      destination.endsWith('.webp') ? '-quality 100' : '',
      destination.endsWith('.jpg') ? '-qmin 1 -qscale:v 1' : '',
      `"${destination.replace('"', '\\"')}"`,
    ];

    const ffmpeg = spawn(config.ffmpeg.path, args, { shell: true });

    return new Promise((resolve, reject) => {
      let output = '';
      ffmpeg.stderr.on('data', (data) => (output += data.toString()));

      ffmpeg.on('exit', (code) => {
        if (code !== 0) {
          return reject(new Error(`ffmpeg exited with code: ${code}, stderr: ${output}`));
        }

        resolve();
      });
    });
  }
}

export default Thumbnailer;
