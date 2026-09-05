import { TASK_STATUSES } from '../../domain/task/TaskStatus.js';

export const StatusFilter = Object.freeze({
  ALL: 'all',
  OVERDUE: 'overdue'
});

export const STATUS_FILTERS = Object.freeze([StatusFilter.ALL, ...TASK_STATUSES, StatusFilter.OVERDUE]);

export const SortOrder = Object.freeze({
  DUE_DATE: 'dueDate',
  CREATED_AT: 'createdAt',
  TITLE: 'title'
});

export const SORT_ORDERS = Object.freeze(Object.values(SortOrder));

export class TaskCriteria {
  #status;
  #search;
  #sort;

  constructor({ status, search, sort }) {
    this.#status = status;
    this.#search = search;
    this.#sort = sort;
    Object.freeze(this);
  }

  static fromQuery(query = {}) {
    const pick = (value, allowed, fallback) =>
      typeof value === 'string' && allowed.includes(value) ? value : fallback;

    return new TaskCriteria({
      status: pick(query.status, STATUS_FILTERS, StatusFilter.ALL),
      search: typeof query.search === 'string' ? query.search.trim() : '',
      sort: pick(query.sort, SORT_ORDERS, SortOrder.DUE_DATE)
    });
  }

  get status() {
    return this.#status;
  }

  get search() {
    return this.#search;
  }

  get sort() {
    return this.#sort;
  }

  get isDefault() {
    return this.#status === StatusFilter.ALL && this.#search === '' && this.#sort === SortOrder.DUE_DATE;
  }

  toQueryString() {
    const params = new URLSearchParams();
    if (this.#status !== StatusFilter.ALL) {
      params.set('status', this.#status);
    }
    if (this.#search !== '') {
      params.set('search', this.#search);
    }
    if (this.#sort !== SortOrder.DUE_DATE) {
      params.set('sort', this.#sort);
    }
    const query = params.toString();
    return query === '' ? '' : `?${query}`;
  }
}
