import { Router } from 'express';
import { createTaskRoutes } from './taskRoutes.js';

export const createRouter = (dependencies) => {
  const router = Router();

  router.get('/', (req, res) => res.redirect('/tasks'));
  router.use('/tasks', createTaskRoutes(dependencies));

  return router;
};
