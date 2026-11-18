import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export function saveFile(dir: string, filename: string, buffer: Buffer): void {
  const targetDir = path.join(env.STORAGE_DIR, dir);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, filename), buffer);
}

export function getFilePath(dir: string, filename: string): string {
  return path.join(env.STORAGE_DIR, dir, filename);
}

export function buildUrl(kind: string, filename: string): string {
  return `${env.PUBLIC_BASE_URL}/api/assets/${kind}/${filename}`;
}

export function deleteFile(dir: string, filename: string): void {
  try {
    const fullPath = path.join(env.STORAGE_DIR, dir, filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // Ignore deletion errors in rollback cleanup
  }
}
