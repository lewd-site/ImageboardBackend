import { spawn } from 'child_process';
import { existsSync } from 'fs';
import config from './config';

export class Thumbnailer {
  public createThumbnail(source: string, destination: string, size: number): Promise<void> {
    if (!existsSync(source)) {
      throw new Error(`File "${source}" not found`);
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
      ffmpeg.stderr.on('error', reject);

      ffmpeg.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg exited with code: ${output}, stderr: ${output}`));
        }
      });

      ffmpeg.on('close', resolve);
    });
  }
}

export default Thumbnailer;
