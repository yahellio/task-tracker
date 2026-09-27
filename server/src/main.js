import fs from 'node:fs/promises';
import path from 'node:path';
import { createApp } from './app.js';
import { AuthRepository } from './authRepository.js';
import { AuthService } from './authService.js';
import { createLogger } from './logger.js';
import { createMailer } from './mailer.js';
import { PgTaskRepository, connectDatabase } from './repository.js';
import { LocalFileStorage } from './storage.js';
import { TaskService } from './taskService.js';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const config = {
  host: process.env.HOST ?? '127.0.0.1',
  port: toInt(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/task_tracker',
  uploadsDir: path.resolve(process.env.UPLOADS_DIR ?? 'uploads'),
  uploads: {
    maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024),
    maxFilesPerRequest: toInt(process.env.MAX_FILES, 5)
  },
  mail: {
    smtpUrl: process.env.SMTP_URL ?? '',
    from: process.env.MAIL_FROM ?? 'Трекер задач <no-reply@task-tracker.local>'
  },
  admin: {
    email: (process.env.ADMIN_EMAIL ?? 'admin@task-tracker.local').toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? 'admin12345'
  },
  policy: {
    sessionTtlMinutes: toInt(process.env.SESSION_TTL_MINUTES, 60),
    resetTtlMinutes: toInt(process.env.RESET_TTL_MINUTES, 15),
    maxSessions: toInt(process.env.MAX_SESSIONS, 5),
    maxFailedAttempts: toInt(process.env.MAX_FAILED_ATTEMPTS, 5),
    lockMinutes: toInt(process.env.LOCK_MINUTES, 15)
  }
};

const logger = createLogger({ level: config.logLevel });

await fs.mkdir(config.uploadsDir, { recursive: true });
const pool = await connectDatabase(config.databaseUrl);

const authService = new AuthService({
  repository: new AuthRepository(pool),
  mailer: createMailer({ ...config.mail, appUrl: config.appUrl, logger }),
  logger,
  policy: config.policy
});

const taskService = new TaskService({
  repository: new PgTaskRepository(pool),
  storage: new LocalFileStorage(config.uploadsDir)
});

await authService.ensureAdmin(config.admin);

const server = createApp({ taskService, authService, uploads: config.uploads, logger }).listen(
  config.port,
  config.host,
  () => {
    logger.info('server.started', { host: config.host, port: config.port });
  }
);

const shutdown = () => {
  server.close(async () => {
    await pool.end();
    logger.info('server.stopped');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
