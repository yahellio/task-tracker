import { ValidationError } from '../errors.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isRealDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export class DueDate {
  #value;

  constructor(value) {
    if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || !isRealDate(value)) {
      throw ValidationError.forField('dueDate', 'Указана некорректная дата завершения');
    }
    this.#value = value;
    Object.freeze(this);
  }

  static fromNullable(value) {
    return value === null || value === undefined || value === '' ? null : new DueDate(value);
  }

  static today(clock = () => new Date()) {
    const now = clock();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return new DueDate(local.toISOString().slice(0, 10));
  }

  isBefore(other) {
    return this.#value < other.toString();
  }

  equals(other) {
    return other instanceof DueDate && other.toString() === this.#value;
  }

  toString() {
    return this.#value;
  }

  toJSON() {
    return this.#value;
  }
}
