import {
  ROLES,
  TASK_STATUSES,
  TaskStatus,
  ValidationError,
  emailFieldError,
  passwordFieldError,
  taskFieldErrors
} from './domain.js';

export const StatusFilter = Object.freeze({ ALL: 'all', OVERDUE: 'overdue' });
export const SortOrder = Object.freeze({ DUE_DATE: 'dueDate', CREATED_AT: 'createdAt', TITLE: 'title' });

const STATUS_FILTERS = [StatusFilter.ALL, ...TASK_STATUSES, StatusFilter.OVERDUE];
const SORT_ORDERS = Object.values(SortOrder);

const asObject = (value) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asString = (value) => (typeof value === 'string' ? value.trim() : '');
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

const reject = (message, fields) => {
  throw new ValidationError(message, fields);
};

export const parseTaskInput = (body) => {
  const source = asObject(body);
  const input = {
    title: asString(source.title),
    description: asString(source.description),
    status: asString(source.status) || TaskStatus.TODO,
    dueDate: asString(source.dueDate) || null
  };
  const errors = taskFieldErrors(input);
  if (Object.keys(errors).length > 0) {
    reject('Данные задачи заполнены некорректно', errors);
  }
  return input;
};

export const parseCriteria = (query) =>
  Object.freeze({
    status: oneOf(query.status, STATUS_FILTERS, StatusFilter.ALL),
    search: asString(query.search),
    sort: oneOf(query.sort, SORT_ORDERS, SortOrder.DUE_DATE)
  });

export const parseCredentials = (body) => {
  const source = asObject(body);
  const email = asString(source.email).toLowerCase();
  const password = typeof source.password === 'string' ? source.password : '';
  const errors = {};

  const emailError = emailFieldError(email);
  if (emailError !== null) {
    errors.email = emailError;
  }
  const passwordError = passwordFieldError(password);
  if (passwordError !== null) {
    errors.password = passwordError;
  }
  if (Object.keys(errors).length > 0) {
    reject('Учётные данные заполнены некорректно', errors);
  }
  return { email, password };
};

export const parseEmail = (body) => {
  const email = asString(asObject(body).email).toLowerCase();
  const emailError = emailFieldError(email);
  if (emailError !== null) {
    reject('Адрес электронной почты указан неверно', { email: emailError });
  }
  return email;
};

export const parsePasswordReset = (body) => {
  const source = asObject(body);
  const token = asString(source.token);
  const password = typeof source.password === 'string' ? source.password : '';
  const errors = {};

  if (token.length === 0) {
    errors.token = 'Ссылка восстановления недействительна';
  }
  const passwordError = passwordFieldError(password);
  if (passwordError !== null) {
    errors.password = passwordError;
  }
  if (Object.keys(errors).length > 0) {
    reject('Не удалось изменить пароль', errors);
  }
  return { token, password };
};

export const parseRole = (body) => {
  const role = asString(asObject(body).role);
  if (!ROLES.includes(role)) {
    reject('Указана неизвестная роль', { role: 'Указана неизвестная роль' });
  }
  return role;
};
