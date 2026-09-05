import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { ATTACHMENTS_FIELD } from './middleware/uploads.js';
import { createRouter } from './routes.js';

export const createApp = ({ config, taskController, uploadMiddleware, logger = console }) => {
  const app = express();

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', config.viewsDir);

  app.locals.appName = 'Трекер задач';
  app.locals.uploads = {
    field: ATTACHMENTS_FIELD,
    maxFiles: config.uploads.maxFilesPerRequest,
    maxFileSizeMb: Math.round(config.uploads.maxFileSizeBytes / (1024 * 1024))
  };

  app.use(express.static(config.publicDir));
  app.use(express.urlencoded({ extended: false }));
  app.use(createRouter({ taskController, uploadMiddleware }));
  app.use(notFoundHandler());
  app.use(errorHandler({ logger }));

  return app;
};
