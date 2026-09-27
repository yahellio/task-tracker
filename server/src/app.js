import express from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { AppError, NotFoundError } from './domain.js';
import { createRouter } from './routes.js';

const MULTER_MESSAGES = Object.freeze({
  LIMIT_FILE_SIZE: 'Размер файла превышает допустимый лимит',
  LIMIT_FILE_COUNT: 'Превышено количество файлов в одном запросе',
  LIMIT_UNEXPECTED_FILE: 'Получено неизвестное файловое поле'
});

const requestContext = (logger) => (req, res, next) => {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  req.log = logger.child({ requestId });
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    req.log.info('http.request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number((process.hrtime.bigint() - startedAt) / 1_000_000n),
      userId: req.actor?.id ?? null
    });
  });

  next();
};

const describe = (error) => {
  if (error instanceof multer.MulterError) {
    return { status: 400, message: MULTER_MESSAGES[error.code] ?? 'Не удалось загрузить файл' };
  }
  if (error.type === 'entity.parse.failed') {
    return { status: 400, message: 'Тело запроса не является корректным JSON' };
  }
  if (error.type === 'entity.too.large') {
    return { status: 413, message: 'Тело запроса слишком велико' };
  }
  if (error instanceof AppError) {
    return {
      status: error.status,
      message: error.message,
      fields: error.fields,
      retryAfterSeconds: error.retryAfterSeconds
    };
  }
  return { status: 500, message: 'Внутренняя ошибка сервера' };
};

export const createApp = ({ taskService, authService, uploads, logger }) => {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext(logger));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createRouter({ taskService, authService, uploads }));

  app.use((req, res, next) => next(new NotFoundError('Ресурс не найден')));

  app.use((error, req, res, _next) => {
    const { status, message, fields, retryAfterSeconds } = describe(error);

    if (status >= 500) {
      req.log.error('http.failure', { message: error.message, stack: error.stack });
    } else if (status === 401 || status === 403 || status === 429) {
      req.log.warn('http.denied', { status, message });
    }

    if (status === 401) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="task-tracker"');
    }
    if (retryAfterSeconds !== undefined) {
      res.setHeader('Retry-After', retryAfterSeconds);
    }

    res.status(status).json({ error: fields ? { message, fields } : { message } });
  });

  return app;
};
