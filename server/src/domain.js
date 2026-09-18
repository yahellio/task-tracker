export class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, 422);
    this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

export const TaskStatus = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
});

export const TASK_STATUSES = Object.freeze(Object.values(TaskStatus));

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDate = (value) => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const todayIso = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const taskFieldErrors = ({ title, description, status, dueDate }) => {
  const errors = {};
  if (title.length === 0) {
    errors.title = 'Название задачи обязательно';
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Название не должно превышать ${TITLE_MAX_LENGTH} символов`;
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Описание не должно превышать ${DESCRIPTION_MAX_LENGTH} символов`;
  }
  if (!TASK_STATUSES.includes(status)) {
    errors.status = 'Указан неизвестный статус задачи';
  }
  if (dueDate !== null && !isIsoDate(dueDate)) {
    errors.dueDate = 'Указана некорректная дата завершения';
  }
  return errors;
};

const assertValid = (fields) => {
  const errors = taskFieldErrors(fields);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Данные задачи заполнены некорректно', errors);
  }
};

export class Task {
  #id;
  #title;
  #description;
  #status;
  #dueDate;
  #attachments;
  #createdAt;
  #updatedAt;

  constructor({ id, title, description, status, dueDate, attachments, createdAt, updatedAt }) {
    assertValid({ title, description, status, dueDate });
    this.#id = id;
    this.#title = title;
    this.#description = description;
    this.#status = status;
    this.#dueDate = dueDate;
    this.#attachments = attachments.map((attachment) => Object.freeze({ ...attachment }));
    this.#createdAt = new Date(createdAt);
    this.#updatedAt = new Date(updatedAt);
  }

  static create({ id, title, description, status, dueDate, now = new Date() }) {
    return new Task({ id, title, description, status, dueDate, attachments: [], createdAt: now, updatedAt: now });
  }

  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }

  get attachments() {
    return [...this.#attachments];
  }

  get isCompleted() {
    return this.#status === TaskStatus.DONE;
  }

  isOverdue(today = todayIso()) {
    return !this.isCompleted && this.#dueDate !== null && this.#dueDate < today;
  }

  update({ title, description, status, dueDate }, now = new Date()) {
    assertValid({ title, description, status, dueDate });
    this.#title = title;
    this.#description = description;
    this.#status = status;
    this.#dueDate = dueDate;
    this.#updatedAt = now;
  }

  changeStatus(status, now = new Date()) {
    if (!TASK_STATUSES.includes(status)) {
      throw new ValidationError('Указан неизвестный статус задачи', { status: 'Указан неизвестный статус задачи' });
    }
    if (this.#status !== status) {
      this.#status = status;
      this.#updatedAt = now;
    }
  }

  attach(attachment, now = new Date()) {
    this.#attachments.push(Object.freeze({ ...attachment }));
    this.#updatedAt = now;
  }

  findAttachment(attachmentId) {
    const attachment = this.#attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      throw new NotFoundError('Вложение не найдено');
    }
    return attachment;
  }

  detach(attachmentId, now = new Date()) {
    const attachment = this.findAttachment(attachmentId);
    this.#attachments = this.#attachments.filter((item) => item !== attachment);
    this.#updatedAt = now;
    return attachment;
  }

  toState() {
    return {
      id: this.#id,
      title: this.#title,
      description: this.#description,
      status: this.#status,
      dueDate: this.#dueDate,
      attachments: this.attachments,
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString()
    };
  }

  toJSON() {
    return {
      id: this.#id,
      title: this.#title,
      description: this.#description,
      status: this.#status,
      dueDate: this.#dueDate,
      isOverdue: this.isOverdue(),
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
      attachments: this.#attachments.map(({ id, originalName, mimeType, size, uploadedAt }) => ({
        id,
        name: originalName,
        mimeType,
        size,
        uploadedAt
      }))
    };
  }
}
