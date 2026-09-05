import { NotFoundError } from '../../domain/errors.js';

export const notFoundHandler = () => (req, res, next) => {
  next(new NotFoundError('Страница не найдена'));
};
