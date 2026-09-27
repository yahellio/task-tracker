import { Router } from 'express';
import multer from 'multer';
import { ForbiddenError, NotFoundError, UnauthorizedError, can } from './domain.js';
import { parseCredentials, parseCriteria, parseEmail, parsePasswordReset, parseRole, parseTaskInput } from './validation.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BEARER_PATTERN = /^Bearer (.+)$/;

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const requireUuid = (req, res, next, value) => {
  next(UUID_PATTERN.test(value) ? undefined : new NotFoundError('Ресурс не найден'));
};

const authenticate = (authService) =>
  wrap(async (req, res, next) => {
    const match = BEARER_PATTERN.exec(req.get('authorization') ?? '');
    if (match === null) {
      throw new UnauthorizedError('Требуется ключ доступа');
    }
    const { user, session } = await authService.authenticate(match[1]);
    req.actor = user;
    req.session = session;
    req.log = req.log.child({ userId: user.id, role: user.role });
    next();
  });

const requirePermission = (permission) => (req, res, next) => {
  next(can(req.actor.role, permission) ? undefined : new ForbiddenError('Недостаточно прав для этого действия'));
};

const takeUploads = (req) =>
  (req.files ?? []).map((file) => ({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    content: file.buffer
  }));

export const createRouter = ({ taskService, authService, uploads }) => {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    defParamCharset: 'utf8',
    limits: { fileSize: uploads.maxFileSizeBytes, files: uploads.maxFilesPerRequest }
  }).array('attachments', uploads.maxFilesPerRequest);
  const clientInfo = (req) => ({ userAgent: req.get('user-agent') ?? '' });

  router.post(
    '/auth/register',
    wrap(async (req, res) => {
      res.status(201).json(await authService.register(parseCredentials(req.body), clientInfo(req)));
    })
  );

  router.post(
    '/auth/login',
    wrap(async (req, res) => {
      res.json(await authService.login(parseCredentials(req.body), clientInfo(req)));
    })
  );

  router.post(
    '/auth/password-reset',
    wrap(async (req, res) => {
      await authService.requestPasswordReset(parseEmail(req.body));
      res.status(202).json({ message: 'Если адрес зарегистрирован, на него отправлено письмо' });
    })
  );

  router.post(
    '/auth/password-reset/confirm',
    wrap(async (req, res) => {
      await authService.confirmPasswordReset(parsePasswordReset(req.body));
      res.status(204).end();
    })
  );

  router.use(authenticate(authService));
  router.param('id', requireUuid);
  router.param('attachmentId', requireUuid);

  router.get('/auth/me', (req, res) => {
    res.json({ user: req.actor, expiresAt: req.session.expiresAt });
  });

  router.post(
    '/auth/logout',
    wrap(async (req, res) => {
      await authService.logout(req.session.id);
      res.status(204).end();
    })
  );

  router.get(
    '/sessions',
    wrap(async (req, res) => {
      res.json(await authService.listSessions(req.actor, req.session.id));
    })
  );

  router.delete(
    '/sessions',
    wrap(async (req, res) => {
      await authService.revokeOtherSessions(req.actor, req.session.id);
      res.status(204).end();
    })
  );

  router.delete(
    '/sessions/:id',
    wrap(async (req, res) => {
      await authService.revokeSession(req.actor, req.params.id);
      res.status(204).end();
    })
  );

  router.get(
    '/users',
    requirePermission('manageUsers'),
    wrap(async (req, res) => {
      res.json(await authService.listUsers());
    })
  );

  router.patch(
    '/users/:id/role',
    requirePermission('manageUsers'),
    wrap(async (req, res) => {
      res.json(await authService.changeRole(req.actor, req.params.id, parseRole(req.body)));
    })
  );

  router.get(
    '/tasks',
    wrap(async (req, res) => {
      const { tasks, summary } = await taskService.list(req.actor, parseCriteria(req.query));
      res.json({ items: tasks, summary });
    })
  );

  router.post(
    '/tasks',
    wrap(async (req, res) => {
      const task = await taskService.create(req.actor, parseTaskInput(req.body));
      res.status(201).location(`/api/tasks/${task.id}`).json(task);
    })
  );

  router.get(
    '/tasks/:id',
    wrap(async (req, res) => {
      res.json(await taskService.get(req.actor, req.params.id));
    })
  );

  router.put(
    '/tasks/:id',
    wrap(async (req, res) => {
      res.json(await taskService.update(req.actor, req.params.id, parseTaskInput(req.body)));
    })
  );

  router.patch(
    '/tasks/:id/status',
    wrap(async (req, res) => {
      res.json(await taskService.changeStatus(req.actor, req.params.id, req.body?.status));
    })
  );

  router.delete(
    '/tasks/:id',
    wrap(async (req, res) => {
      await taskService.remove(req.actor, req.params.id);
      res.status(204).end();
    })
  );

  router.post(
    '/tasks/:id/attachments',
    upload,
    wrap(async (req, res) => {
      res.status(201).json(await taskService.addAttachments(req.actor, req.params.id, takeUploads(req)));
    })
  );

  router.get(
    '/tasks/:id/attachments/:attachmentId',
    wrap(async (req, res) => {
      const { attachment, path } = await taskService.locateAttachment(
        req.actor,
        req.params.id,
        req.params.attachmentId
      );
      await new Promise((resolve, reject) => {
        res.download(path, attachment.originalName, (error) => {
          if (error) {
            reject(res.headersSent ? error : new NotFoundError('Файл вложения не найден'));
          } else {
            resolve();
          }
        });
      });
    })
  );

  router.delete(
    '/tasks/:id/attachments/:attachmentId',
    wrap(async (req, res) => {
      await taskService.removeAttachment(req.actor, req.params.id, req.params.attachmentId);
      res.status(204).end();
    })
  );

  return router;
};
