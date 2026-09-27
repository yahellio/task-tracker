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

export class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message) {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message, retryAfterSeconds) {
    super(message, 429);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const Role = Object.freeze({
  USER: 'user',
  MANAGER: 'manager',
  ADMIN: 'admin'
});

export const ROLES = Object.freeze(Object.values(Role));

const PERMISSIONS = Object.freeze({
  [Role.USER]: Object.freeze({ readAllTasks: false, writeAllTasks: false, deleteAllTasks: false, manageUsers: false }),
  [Role.MANAGER]: Object.freeze({ readAllTasks: true, writeAllTasks: true, deleteAllTasks: false, manageUsers: false }),
  [Role.ADMIN]: Object.freeze({ readAllTasks: true, writeAllTasks: true, deleteAllTasks: true, manageUsers: true })
});

export const can = (role, permission) => PERMISSIONS[role]?.[permission] === true;

export const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt
});

export const TaskStatus = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
});

export const TASK_STATUSES = Object.freeze(Object.values(TaskStatus));

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export const emailFieldError = (email) => {
  if (email.length === 0) {
    return 'Адрес электронной почты обязателен';
  }
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    return 'Адрес электронной почты указан неверно';
  }
  return null;
};

export const passwordFieldError = (password) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Пароль должен содержать не менее ${PASSWORD_MIN_LENGTH} символов`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Пароль не должен превышать ${PASSWORD_MAX_LENGTH} символов`;
  }
  return null;
};

const assertValid = (fields) => {
  const errors = taskFieldErrors(fields);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Данные задачи заполнены некорректно', errors);
  }
};

export class Task {
  #id;
  #ownerId;
  #ownerEmail;
  #title;
  #description;
  #status;
  #dueDate;
  #attachments;
  #createdAt;
  #updatedAt;

  constructor({ id, ownerId, ownerEmail, title, description, status, dueDate, attachments, createdAt, updatedAt }) {
    assertValid({ title, description, status, dueDate });
    this.#id = id;
    this.#ownerId = ownerId;
    this.#ownerEmail = ownerEmail ?? null;
    this.#title = title;
    this.#description = description;
    this.#status = status;
    this.#dueDate = dueDate;
    this.#attachments = attachments.map((attachment) => Object.freeze({ ...attachment }));
    this.#createdAt = new Date(createdAt);
    this.#updatedAt = new Date(updatedAt);
  }

  static create({ id, ownerId, ownerEmail, title, description, status, dueDate, now = new Date() }) {
    return new Task({
      id,
      ownerId,
      ownerEmail,
      title,
      description,
      status,
      dueDate,
      attachments: [],
      createdAt: now,
      updatedAt: now
    });
  }

  get id() {
    return this.#id;
  }

  get ownerId() {
    return this.#ownerId;
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
      ownerId: this.#ownerId,
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
      owner: { id: this.#ownerId, email: this.#ownerEmail },
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
