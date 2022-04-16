import { stat } from 'fs/promises';

export async function delay(milliseconds: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
