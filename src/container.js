import fs from 'node:fs/promises';
import { TaskService } from './application/TaskService.js';
import { UuidIdGenerator } from './infrastructure/id/UuidIdGenerator.js';
import { JsonFileStore } from './infrastructure/persistence/JsonFileStore.js';
import { JsonTaskRepository } from './infrastructure/persistence/JsonTaskRepository.js';
import { LocalFileStorage } from './infrastructure/storage/LocalFileStorage.js';
import { TaskController } from './web/controllers/TaskController.js';
import { createUploadMiddleware } from './web/middleware/uploads.js';

export const createContainer = async (config) => {
  await fs.mkdir(config.storage.dataDir, { recursive: true });
  await fs.mkdir(config.storage.uploadsDir, { recursive: true });

  const idGenerator = new UuidIdGenerator();
  const store = new JsonFileStore({ filePath: config.storage.tasksFile, fallback: [] });
  const taskRepository = new JsonTaskRepository({ store });
  const fileStorage = new LocalFileStorage({ directory: config.storage.uploadsDir, idGenerator });
  const taskService = new TaskService({ taskRepository, fileStorage, idGenerator });

  return {
    config,
    taskController: new TaskController({ taskService }),
    uploadMiddleware: createUploadMiddleware(config.uploads)
  };
};
