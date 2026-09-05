import { ValidationError } from '../../domain/errors.js';
import { DueDate } from '../../domain/task/DueDate.js';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '../../domain/task/Task.js';
import { isTaskStatus, TaskStatus } from '../../domain/task/TaskStatus.js';

const asString = (value) => (typeof value === 'string' ? value.trim() : '');

export class TaskForm {
  static empty() {
    return { title: '', description: '', status: TaskStatus.TODO, dueDate: '' };
  }

  static raw(body = {}) {
    return {
      title: asString(body.title),
      description: asString(body.description),
      status: asString(body.status) || TaskStatus.TODO,
      dueDate: asString(body.dueDate)
    };
  }

  static parse(body = {}) {
    const raw = TaskForm.raw(body);
    const fieldErrors = {};

    if (raw.title.length === 0) {
      fieldErrors.title = 'Название задачи обязательно';
    } else if (raw.title.length > TITLE_MAX_LENGTH) {
      fieldErrors.title = `Название не должно превышать ${TITLE_MAX_LENGTH} символов`;
    }

    if (raw.description.length > DESCRIPTION_MAX_LENGTH) {
      fieldErrors.description = `Описание не должно превышать ${DESCRIPTION_MAX_LENGTH} символов`;
    }

    if (!isTaskStatus(raw.status)) {
      fieldErrors.status = 'Указан неизвестный статус задачи';
    }

    let dueDate = null;
    try {
      dueDate = DueDate.fromNullable(raw.dueDate);
    } catch {
      fieldErrors.dueDate = 'Указана некорректная дата завершения';
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError('Форма заполнена некорректно', fieldErrors);
    }

    return {
      title: raw.title,
      description: raw.description,
      status: raw.status,
      dueDate
    };
  }
}
