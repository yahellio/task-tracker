import { StatusFilter, SortOrder } from '../../application/dto/TaskCriteria.js';
import { Task } from '../../domain/task/Task.js';
import { TaskRepository } from '../../domain/task/TaskRepository.js';
import { TASK_STATUSES } from '../../domain/task/TaskStatus.js';

const byDueDate = (left, right) => {
  const leftDate = left.dueDate?.toString() ?? null;
  const rightDate = right.dueDate?.toString() ?? null;
  if (leftDate === rightDate) {
    return right.createdAt - left.createdAt;
  }
  if (leftDate === null) {
    return 1;
  }
  if (rightDate === null) {
    return -1;
  }
  return leftDate < rightDate ? -1 : 1;
};

const COMPARATORS = Object.freeze({
  [SortOrder.DUE_DATE]: byDueDate,
  [SortOrder.CREATED_AT]: (left, right) => right.createdAt - left.createdAt,
  [SortOrder.TITLE]: (left, right) => left.title.localeCompare(right.title, 'ru')
});

const matchesStatus = (task, statusFilter, today) => {
  if (statusFilter === StatusFilter.ALL) {
    return true;
  }
  if (statusFilter === StatusFilter.OVERDUE) {
    return task.isOverdue(today);
  }
  return task.status === statusFilter;
};

const matchesSearch = (task, search) => {
  if (search === '') {
    return true;
  }
  const needle = search.toLowerCase();
  return task.title.toLowerCase().includes(needle) || task.description.toLowerCase().includes(needle);
};

export class JsonTaskRepository extends TaskRepository {
  #store;

  constructor({ store }) {
    super();
    this.#store = store;
  }

  async find(criteria, today) {
    const tasks = await this.#all();
    return tasks
      .filter((task) => matchesStatus(task, criteria.status, today) && matchesSearch(task, criteria.search))
      .sort(COMPARATORS[criteria.sort]);
  }

  async findById(id) {
    const tasks = await this.#all();
    return tasks.find((task) => task.id === id) ?? null;
  }

  async countByStatus(today) {
    const tasks = await this.#all();
    const summary = { [StatusFilter.ALL]: tasks.length, [StatusFilter.OVERDUE]: 0 };
    for (const status of TASK_STATUSES) {
      summary[status] = 0;
    }
    for (const task of tasks) {
      summary[task.status] += 1;
      if (task.isOverdue(today)) {
        summary[StatusFilter.OVERDUE] += 1;
      }
    }
    return summary;
  }

  async add(task) {
    await this.#store.mutate((states) => ({ next: [...states, task.toState()] }));
  }

  async update(task) {
    await this.#store.mutate((states) => ({
      next: states.map((state) => (state.id === task.id ? task.toState() : state))
    }));
  }

  async remove(id) {
    await this.#store.mutate((states) => ({ next: states.filter((state) => state.id !== id) }));
  }

  async #all() {
    const states = await this.#store.read();
    return states.map((state) => Task.restore(state));
  }
}
