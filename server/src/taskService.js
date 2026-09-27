import { randomUUID } from 'node:crypto';
import { ForbiddenError, NotFoundError, Task, ValidationError, can, todayIso } from './domain.js';

const NAME_MAX_LENGTH = 255;

const cleanName = (name) => {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  const printable = [...(trimmed.length > 0 ? trimmed : 'file')].filter((char) => char >= ' ').join('');
  return printable.slice(0, NAME_MAX_LENGTH);
};

export class TaskService {
  #repository;
  #storage;

  constructor({ repository, storage }) {
    this.#repository = repository;
    this.#storage = storage;
  }

  async list(actor, criteria) {
    const today = todayIso();
    const scope = can(actor.role, 'readAllTasks') ? null : actor.id;
    const [tasks, summary] = await Promise.all([
      this.#repository.find(criteria, today, scope),
      this.#repository.countByStatus(today, scope)
    ]);
    return { tasks, summary };
  }

  async get(actor, id) {
    return this.#load(actor, id, 'readAllTasks');
  }

  async create(actor, input) {
    const task = Task.create({ id: randomUUID(), ownerId: actor.id, ownerEmail: actor.email, ...input });
    await this.#repository.add(task);
    return task;
  }

  async update(actor, id, input) {
    const task = await this.#load(actor, id, 'writeAllTasks');
    task.update(input);
    await this.#repository.update(task);
    return task;
  }

  async changeStatus(actor, id, status) {
    const task = await this.#load(actor, id, 'writeAllTasks');
    task.changeStatus(status);
    await this.#repository.update(task);
    return task;
  }

  async remove(actor, id) {
    const task = await this.#load(actor, id, 'deleteAllTasks');
    await this.#repository.remove(task.id);
    await Promise.all(task.attachments.map((attachment) => this.#storage.remove(attachment.storageKey)));
  }

  async addAttachments(actor, id, uploads) {
    if (uploads.length === 0) {
      throw new ValidationError('Файлы не выбраны', { attachments: 'Выберите хотя бы один файл' });
    }
    const task = await this.#load(actor, id, 'writeAllTasks');
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

  async removeAttachment(actor, taskId, attachmentId) {
    const task = await this.#load(actor, taskId, 'writeAllTasks');
    const removed = task.detach(attachmentId);
    await this.#repository.update(task);
    await this.#storage.remove(removed.storageKey);
  }

  async locateAttachment(actor, taskId, attachmentId) {
    const task = await this.#load(actor, taskId, 'readAllTasks');
    const attachment = task.findAttachment(attachmentId);
    return { attachment, path: this.#storage.locate(attachment.storageKey) };
  }

  async #load(actor, id, permission) {
    const task = await this.#repository.findById(id);
    if (task === null) {
      throw new NotFoundError('Задача не найдена');
    }
    if (task.ownerId !== actor.id && !can(actor.role, permission)) {
      throw new ForbiddenError('Недостаточно прав для действия с этой задачей');
    }
    return task;
  }
}
