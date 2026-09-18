import { randomUUID } from 'node:crypto';
import { NotFoundError, Task, todayIso, ValidationError } from './domain.js';

const NAME_MAX_LENGTH = 255;

const cleanName = (name) =>
  (typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'file')
    .replace(/[\u0000-\u001f]/g, '')
    .slice(0, NAME_MAX_LENGTH);

export class TaskService {
  #repository;
  #storage;

  constructor({ repository, storage }) {
    this.#repository = repository;
    this.#storage = storage;
  }

  async list(criteria) {
    const today = todayIso();
    const [tasks, summary] = await Promise.all([
      this.#repository.find(criteria, today),
      this.#repository.countByStatus(today)
    ]);
    return { tasks, summary };
  }

  async get(id) {
    const task = await this.#repository.findById(id);
    if (task === null) {
      throw new NotFoundError('Задача не найдена');
    }
    return task;
  }

  async create(input) {
    const task = Task.create({ id: randomUUID(), ...input });
    await this.#repository.add(task);
    return task;
  }

  async update(id, input) {
    const task = await this.get(id);
    task.update(input);
    await this.#repository.update(task);
    return task;
  }

  async changeStatus(id, status) {
    const task = await this.get(id);
    task.changeStatus(status);
    await this.#repository.update(task);
    return task;
  }

  async remove(id) {
    const task = await this.get(id);
    await this.#repository.remove(task.id);
    await Promise.all(task.attachments.map((attachment) => this.#storage.remove(attachment.storageKey)));
  }

  async addAttachments(id, uploads) {
    if (uploads.length === 0) {
      throw new ValidationError('Файлы не выбраны', { attachments: 'Выберите хотя бы один файл' });
    }
    const task = await this.get(id);
    for (const upload of uploads) {
      const storageKey = await this.#storage.save(upload);
      task.attach({
        id: randomUUID(),
        originalName: cleanName(upload.originalName),
        storageKey,
        mimeType: upload.mimeType,
        size: upload.size,
        uploadedAt: new Date().toISOString()
      });
    }
    await this.#repository.update(task);
    return task;
  }

  async removeAttachment(taskId, attachmentId) {
    const task = await this.get(taskId);
    const removed = task.detach(attachmentId);
    await this.#repository.update(task);
    await this.#storage.remove(removed.storageKey);
  }

  async locateAttachment(taskId, attachmentId) {
    const task = await this.get(taskId);
    const attachment = task.findAttachment(attachmentId);
    return { attachment, path: this.#storage.locate(attachment.storageKey) };
  }
}
