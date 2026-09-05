export const TaskStatus = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
});

export const TASK_STATUSES = Object.freeze(Object.values(TaskStatus));

export const isTaskStatus = (value) => TASK_STATUSES.includes(value);
