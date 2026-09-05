import { NotFoundError, ValidationError } from '../errors.js';
import { Attachment } from './Attachment.js';
import { DueDate } from './DueDate.js';
import { isTaskStatus, TaskStatus } from './TaskStatus.js';

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

const assertTitle = (title) => {
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw ValidationError.forField('title', 'Название задачи обязательно');
  }
  if (title.length > TITLE_MAX_LENGTH) {
    throw ValidationError.forField('title', `Название не должно превышать ${TITLE_MAX_LENGTH} символов`);
  }
};

const assertStatus = (status) => {
  if (!isTaskStatus(status)) {
    throw ValidationError.forField('status', 'Указан неизвестный статус задачи');
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
    assertTitle(title);
    assertStatus(status);
    this.#id = id;
    this.#title = title.trim();
    this.#description = description ?? '';
    this.#status = status;
    this.#dueDate = dueDate ?? null;
    this.#attachments = [...attachments];
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;
  }

  static create({ id, title, description, status = TaskStatus.TODO, dueDate = null, now = new Date() }) {
    return new Task({
      id,
      title,
      description,
      status,
      dueDate,
      attachments: [],
      createdAt: now,
      updatedAt: now
    });
  }

  static restore(state) {
    return new Task({
      id: state.id,
      title: state.title,
      description: state.description,
      status: state.status,
      dueDate: DueDate.fromNullable(state.dueDate),
      attachments: state.attachments.map((item) => new Attachment(item)),
      createdAt: new Date(state.createdAt),
      updatedAt: new Date(state.updatedAt)
    });
  }

  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }

  get description() {
    return this.#description;
  }

  get status() {
    return this.#status;
  }

  get dueDate() {
    return this.#dueDate;
  }

  get attachments() {
    return [...this.#attachments];
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  get isCompleted() {
    return this.#status === TaskStatus.DONE;
  }

  isOverdue(today) {
    return !this.isCompleted && this.#dueDate !== null && this.#dueDate.isBefore(today);
  }

  updateDetails({ title, description, status, dueDate }, now = new Date()) {
    assertTitle(title);
    assertStatus(status);
    this.#title = title.trim();
    this.#description = description ?? '';
    this.#status = status;
    this.#dueDate = dueDate ?? null;
    this.#touch(now);
  }

  changeStatus(status, now = new Date()) {
    assertStatus(status);
    if (this.#status === status) {
      return;
    }
    this.#status = status;
    this.#touch(now);
  }

  attach(attachment, now = new Date()) {
    this.#attachments.push(attachment);
    this.#touch(now);
  }

  detach(attachmentId, now = new Date()) {
    const index = this.#attachments.findIndex((item) => item.id === attachmentId);
    if (index === -1) {
      throw new NotFoundError('Вложение не найдено');
    }
    const [removed] = this.#attachments.splice(index, 1);
    this.#touch(now);
    return removed;
  }

  findAttachment(attachmentId) {
    const attachment = this.#attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      throw new NotFoundError('Вложение не найдено');
    }
    return attachment;
  }

  toState() {
    return {
      id: this.#id,
      title: this.#title,
      description: this.#description,
      status: this.#status,
      dueDate: this.#dueDate === null ? null : this.#dueDate.toString(),
      attachments: this.#attachments.map((item) => item.toState()),
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString()
    };
  }

  #touch(now) {
    this.#updatedAt = now;
  }
}
