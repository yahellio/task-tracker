import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const createTaskRoutes = ({ taskController, uploadMiddleware }) => {
  const router = Router();

  router.get('/', asyncHandler(taskController.index));
  router.get('/new', asyncHandler(taskController.newForm));
  router.post('/', uploadMiddleware, asyncHandler(taskController.create));
  router.get('/:id', asyncHandler(taskController.show));
  router.get('/:id/edit', asyncHandler(taskController.editForm));
  router.post('/:id', asyncHandler(taskController.update));
  router.post('/:id/status', asyncHandler(taskController.changeStatus));
  router.post('/:id/delete', asyncHandler(taskController.destroy));
  router.post('/:id/attachments', uploadMiddleware, asyncHandler(taskController.addAttachments));
  router.get('/:id/attachments/:attachmentId', asyncHandler(taskController.downloadAttachment));
  router.post('/:id/attachments/:attachmentId/delete', asyncHandler(taskController.removeAttachment));

  return router;
};
