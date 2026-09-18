import express from 'express';
import multer from 'multer';
import { AppError, NotFoundError } from './domain.js';
import { createRouter } from './routes.js';

const MULTER_MESSAGES = Object.freeze({
  LIMIT_FILE_SIZE: 'Размер файла превышает допустимый лимит',
  LIMIT_FILE_COUNT: 'Превышено количество файлов в одном запросе',
  LIMIT_UNEXPECTED_FILE: 'Получено неизвестное файловое поле'
});

const describe = (error) => {
  if (error instanceof multer.MulterError) {
    return { status: 400, message: MULTER_MESSAGES[error.code] ?? 'Не удалось загрузить файл' };
  }
  if (error.type === 'entity.parse.failed') {
    return { status: 400, message: 'Тело запроса не является корректным JSON' };
  }
  if (error instanceof AppError) {
    return { status: error.status, message: error.message, fields: error.fields };
  }
  return { status: 500, message: 'Внутренняя ошибка сервера' };
};

export const createApp = ({ service, uploads, logger = console }) => {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/api', createRouter({ service, uploads }));

  app.use((req, res, next) => next(new NotFoundError('Ресурс не найден')));

  app.use((error, req, res, _next) => {
    const { status, message, fields } = describe(error);
    if (status >= 500) {
      logger.error(error);
    }
    res.status(status).json({ error: fields ? { message, fields } : { message } });
  });

  return app;
};
