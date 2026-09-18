import { TASK_STATUSES, TaskStatus, taskFieldErrors, ValidationError } from './domain.js';

export const StatusFilter = Object.freeze({ ALL: 'all', OVERDUE: 'overdue' });
export const SortOrder = Object.freeze({ DUE_DATE: 'dueDate', CREATED_AT: 'createdAt', TITLE: 'title' });

const STATUS_FILTERS = [StatusFilter.ALL, ...TASK_STATUSES, StatusFilter.OVERDUE];
const SORT_ORDERS = Object.values(SortOrder);

const asObject = (value) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asString = (value) => (typeof value === 'string' ? value.trim() : '');
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

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
    throw new ValidationError('Данные задачи заполнены некорректно', errors);
  }
  return input;
};

export const parseCriteria = (query) =>
  Object.freeze({
    status: oneOf(query.status, STATUS_FILTERS, StatusFilter.ALL),
    search: asString(query.search),
    sort: oneOf(query.sort, SORT_ORDERS, SortOrder.DUE_DATE)
  });
