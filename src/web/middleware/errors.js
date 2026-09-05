import multer from 'multer';
import { AppError, NotFoundError } from '../../domain/errors.js';

const MULTER_MESSAGES = Object.freeze({
  LIMIT_FILE_SIZE: 'Размер файла превышает допустимый лимит',
  LIMIT_FILE_COUNT: 'Превышено количество файлов в одном запросе',
  LIMIT_UNEXPECTED_FILE: 'Получено неизвестное файловое поле'
});

const describe = (error) => {
  if (error instanceof multer.MulterError) {
    return { status: 400, message: MULTER_MESSAGES[error.code] ?? 'Не удалось загрузить файл' };
  }
  if (error instanceof AppError) {
    return { status: error.status, message: error.message };
  }
  return { status: 500, message: 'Внутренняя ошибка сервера' };
};

export const notFoundHandler = () => (req, res, next) => {
  next(new NotFoundError('Страница не найдена'));
};

export const errorHandler = ({ logger = console }) =>
  (error, req, res, _next) => {
    const { status, message } = describe(error);
    if (status >= 500) {
      logger.error(error);
    }
    res.status(status).render('pages/error', { pageTitle: `Ошибка ${status}`, status, message });
  };
