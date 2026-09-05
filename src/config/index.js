import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(rootDir, 'data');

export const config = Object.freeze({
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: toInt(process.env.PORT, 3000),
  rootDir,
  publicDir: path.join(rootDir, 'public'),
  viewsDir: path.join(rootDir, 'src', 'web', 'views'),
  storage: Object.freeze({
    dataDir,
    tasksFile: path.join(dataDir, 'tasks.json'),
    uploadsDir: path.join(dataDir, 'uploads')
  }),
  uploads: Object.freeze({
    maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024),
    maxFilesPerRequest: toInt(process.env.MAX_FILES, 5)
  })
});
