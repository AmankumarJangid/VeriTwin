import multer from 'multer';
import { env } from '../config/env';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

// Magic bytes for JPEG (FFD8) and PNG (89504E47)
const MAGIC_BYTES: Record<string, Buffer> = {
  'image/jpeg': Buffer.from([0xff, 0xd8]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
};

function checkMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magic = MAGIC_BYTES[mimeType];
  if (!magic) return false;
  return buffer.subarray(0, magic.length).equals(magic);
}

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
  fileFilter(req: Request, file, cb) {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

export const multerUpload = upload.single('image');

export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  return checkMagicBytes(buffer, mimeType);
}
