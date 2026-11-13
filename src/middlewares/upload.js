import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { InvalidFileError } from '../errors/AppError.js';

const EXTENSION_BY_MIMETYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Aceita só imagens JPEG, PNG ou WEBP, conferindo o tipo e a extensão do nome original.
export function imageFileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (EXTENSION_BY_MIMETYPE[file.mimetype] && ALLOWED_EXTENSIONS.has(extension)) {
    return cb(null, true);
  }
  return cb(new InvalidFileError());
}

export function createUploadMiddleware({ uploadDir, maxSizeMb }) {
  const destination = path.join(uploadDir, 'books');
  fs.mkdirSync(destination, { recursive: true });

  const storage = multer.diskStorage({
    destination,
    // Nome gerado pela API: nunca usamos o nome enviado pelo usuário.
    filename: (req, file, cb) => cb(null, `${randomUUID()}${EXTENSION_BY_MIMETYPE[file.mimetype]}`),
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }).single('cover');
}
