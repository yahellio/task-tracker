import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp } from './app.js';
import { connectDatabase, PgTaskRepository } from './repository.js';
import { TaskService } from './service.js';
import { LocalFileStorage } from './storage.js';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const config = {
  host: process.env.HOST ?? '127.0.0.1',
  port: toInt(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/task_tracker',
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? 'uploads'),
  uploads: {
    maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024),
    maxFilesPerRequest: toInt(process.env.MAX_FILES, 5)
  }
};

await fs.mkdir(config.uploadsDir, { recursive: true });
const pool = await connectDatabase(config.databaseUrl);

const service = new TaskService({
  repository: new PgTaskRepository(pool),
  storage: new LocalFileStorage(config.uploadsDir)
});

const server = createApp({ service, uploads: config.uploads }).listen(config.port, config.host, () => {
  console.log(`Task tracker API is running at http://${config.host}:${config.port}`);
});

const shutdown = () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
