import { NotFoundError } from '../domain/errors.js';
import { Attachment } from '../domain/task/Attachment.js';
import { DueDate } from '../domain/task/DueDate.js';
import { Task } from '../domain/task/Task.js';

const MAX_ORIGINAL_NAME_LENGTH = 255;

const normalizeName = (name) =>
  (typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'file')
    .replace(/[\u0000-\u001f]/g, '')
    .slice(0, MAX_ORIGINAL_NAME_LENGTH);

export class TaskService {
  #tasks;
  #files;
  #ids;
  #clock;

  constructor({ taskRepository, fileStorage, idGenerator, clock = () => new Date() }) {
    this.#tasks = taskRepository;
    this.#files = fileStorage;
    this.#ids = idGenerator;
    this.#clock = clock;
  }

  today() {
    return DueDate.today(this.#clock);
  }

  async getOverview(criteria) {
    const [tasks, summary] = await Promise.all([
      this.#tasks.find(criteria, this.today()),
      this.#tasks.countByStatus(this.today())
    ]);
    return { tasks, summary };
  }

  async getById(id) {
    const task = await this.#tasks.findById(id);
    if (task === null) {
      throw new NotFoundError('Задача не найдена');
    }
    return task;
  }

  async create(input, uploads = []) {
    const task = Task.create({
      id: this.#ids.next(),
      title: input.title,
      description: input.description,
      status: input.status,
      dueDate: input.dueDate,
      now: this.#clock()
    });
    await this.#attachAll(task, uploads);
    await this.#tasks.add(task);
    return task;
  }

  async update(id, input) {
    const task = await this.getById(id);
    task.updateDetails(input, this.#clock());
    await this.#tasks.update(task);
    return task;
  }

  async changeStatus(id, status) {
    const task = await this.getById(id);
    task.changeStatus(status, this.#clock());
    await this.#tasks.update(task);
    return task;
  }

  async remove(id) {
    const task = await this.getById(id);
    await this.#tasks.remove(task.id);
    await Promise.all(task.attachments.map((attachment) => this.#files.remove(attachment.storageKey)));
  }

  async addAttachments(id, uploads) {
    const task = await this.getById(id);
    if (uploads.length === 0) {
      return task;
    }
    await this.#attachAll(task, uploads);
    await this.#tasks.update(task);
    return task;
  }

  async removeAttachment(taskId, attachmentId) {
    const task = await this.getById(taskId);
    const removed = task.detach(attachmentId, this.#clock());
    await this.#tasks.update(task);
    await this.#files.remove(removed.storageKey);
    return task;
  }

  async locateAttachment(taskId, attachmentId) {
    const task = await this.getById(taskId);
    const attachment = task.findAttachment(attachmentId);
    return { attachment, path: this.#files.locate(attachment.storageKey) };
  }

  async #attachAll(task, uploads) {
    for (const upload of uploads) {
      const storageKey = await this.#files.save(upload);
      task.attach(
        new Attachment({
          id: this.#ids.next(),
          originalName: normalizeName(upload.originalName),
          storageKey,
          mimeType: upload.mimeType,
          size: upload.size,
          uploadedAt: this.#clock()
        }),
        this.#clock()
      );
    }
  }
}
