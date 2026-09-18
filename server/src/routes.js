import { Router } from 'express';
import multer from 'multer';
import { NotFoundError } from './domain.js';
import { parseCriteria, parseTaskInput } from './validation.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const requireUuid = (req, res, next, value) => {
  next(UUID_PATTERN.test(value) ? undefined : new NotFoundError('Ресурс не найден'));
};

const takeUploads = (req) =>
  (req.files ?? []).map((file) => ({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    content: file.buffer
  }));

export const createRouter = ({ service, uploads }) => {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    defParamCharset: 'utf8',
    limits: { fileSize: uploads.maxFileSizeBytes, files: uploads.maxFilesPerRequest }
  }).array('attachments', uploads.maxFilesPerRequest);

  router.param('id', requireUuid);
  router.param('attachmentId', requireUuid);

  router.get('/tasks', wrap(async (req, res) => {
    const { tasks, summary } = await service.list(parseCriteria(req.query));
    res.json({ items: tasks, summary });
  }));

  router.post('/tasks', wrap(async (req, res) => {
    res.status(201).json(await service.create(parseTaskInput(req.body)));
  }));

  router.get('/tasks/:id', wrap(async (req, res) => {
    res.json(await service.get(req.params.id));
  }));

  router.put('/tasks/:id', wrap(async (req, res) => {
    res.json(await service.update(req.params.id, parseTaskInput(req.body)));
  }));

  router.patch('/tasks/:id/status', wrap(async (req, res) => {
    res.json(await service.changeStatus(req.params.id, req.body?.status));
  }));

  router.delete('/tasks/:id', wrap(async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
  }));

  router.post('/tasks/:id/attachments', upload, wrap(async (req, res) => {
    res.status(201).json(await service.addAttachments(req.params.id, takeUploads(req)));
  }));

  router.get('/tasks/:id/attachments/:attachmentId', wrap(async (req, res) => {
    const { attachment, path } = await service.locateAttachment(req.params.id, req.params.attachmentId);
    await new Promise((resolve, reject) => {
      res.download(path, attachment.originalName, (error) => {
        if (error) {
          reject(res.headersSent ? error : new NotFoundError('Файл вложения не найден'));
        } else {
          resolve();
        }
      });
    });
  }));

  router.delete('/tasks/:id/attachments/:attachmentId', wrap(async (req, res) => {
    await service.removeAttachment(req.params.id, req.params.attachmentId);
    res.status(204).end();
  }));

  return router;
};
