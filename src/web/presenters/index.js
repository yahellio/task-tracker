import { SortOrder, StatusFilter } from '../../application/dto/TaskCriteria.js';
import { TaskStatus } from '../../domain/task/TaskStatus.js';

const STATUS_VIEW = Object.freeze({
  [TaskStatus.TODO]: { label: 'К выполнению', modifier: 'todo' },
  [TaskStatus.IN_PROGRESS]: { label: 'В работе', modifier: 'in-progress' },
  [TaskStatus.DONE]: { label: 'Выполнена', modifier: 'done' }
});

const QUICK_ACTIONS = Object.freeze({
  [TaskStatus.TODO]: [
    { value: TaskStatus.IN_PROGRESS, label: 'В работу' },
    { value: TaskStatus.DONE, label: 'Выполнено' }
  ],
  [TaskStatus.IN_PROGRESS]: [
    { value: TaskStatus.DONE, label: 'Выполнено' },
    { value: TaskStatus.TODO, label: 'В план' }
  ],
  [TaskStatus.DONE]: [{ value: TaskStatus.IN_PROGRESS, label: 'Вернуть в работу' }]
});

const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];
const TASK_PLURALS = ['задача', 'задачи', 'задач'];

const pluralize = (count, forms) => {
  const tens = count % 100;
  const ones = count % 10;
  if (tens > 10 && tens < 20) {
    return forms[2];
  }
  if (ones === 1) {
    return forms[0];
  }
  if (ones > 1 && ones < 5) {
    return forms[1];
  }
  return forms[2];
};

const formatSize = (bytes) => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${SIZE_UNITS[unit]}`;
};

const formatDueDate = (dueDate) => DATE_FORMAT.format(new Date(`${dueDate.toString()}T00:00:00`));

const extensionOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1, dot + 5) : 'файл';
};

export class TaskPresenter {
  static statusOptions() {
    return Object.entries(STATUS_VIEW).map(([value, view]) => ({ value, label: view.label, modifier: view.modifier }));
  }

  static countLabel(count) {
    return `${count} ${pluralize(count, TASK_PLURALS)}`;
  }

  static toView(task, today) {
    const status = STATUS_VIEW[task.status];
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      statusLabel: status.label,
      statusModifier: status.modifier,
      quickActions: QUICK_ACTIONS[task.status].map((action) => ({
        ...action,
        modifier: STATUS_VIEW[action.value].modifier
      })),
      dueDate: task.dueDate === null ? '' : task.dueDate.toString(),
      dueDateLabel: task.dueDate === null ? 'Без срока' : formatDueDate(task.dueDate),
      hasDueDate: task.dueDate !== null,
      isOverdue: task.isOverdue(today),
      isCompleted: task.isCompleted,
      createdAtLabel: DATE_TIME_FORMAT.format(task.createdAt),
      updatedAtLabel: DATE_TIME_FORMAT.format(task.updatedAt),
      attachmentCount: task.attachments.length,
      attachments: task.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.originalName,
        extension: extensionOf(attachment.originalName),
        sizeLabel: formatSize(attachment.size),
        mimeType: attachment.mimeType,
        uploadedAtLabel: DATE_TIME_FORMAT.format(attachment.uploadedAt)
      }))
    };
  }

  static toList(tasks, today) {
    return tasks.map((task) => TaskPresenter.toView(task, today));
  }

  static toForm(task) {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate === null ? '' : task.dueDate.toString()
    };
  }
}

const STATUS_TABS = Object.freeze([
  { value: StatusFilter.ALL, label: 'Все' },
  { value: TaskStatus.TODO, label: 'К выполнению' },
  { value: TaskStatus.IN_PROGRESS, label: 'В работе' },
  { value: TaskStatus.DONE, label: 'Выполнены' },
  { value: StatusFilter.OVERDUE, label: 'Просрочены' }
]);

const SORT_OPTIONS = Object.freeze([
  { value: SortOrder.DUE_DATE, label: 'По сроку' },
  { value: SortOrder.CREATED_AT, label: 'По дате создания' },
  { value: SortOrder.TITLE, label: 'По названию' }
]);

const buildHref = (criteria, overrides) => `/tasks${criteria.with(overrides).toQueryString()}`;

export class FilterPresenter {
  static toView(criteria, summary) {
    return {
      status: criteria.status,
      search: criteria.search,
      sort: criteria.sort,
      isDefault: criteria.isDefault,
      tabs: STATUS_TABS.map((tab) => ({
        ...tab,
        count: summary[tab.value] ?? 0,
        active: tab.value === criteria.status,
        href: buildHref(criteria, { status: tab.value })
      })),
      sortOptions: SORT_OPTIONS.map((option) => ({ ...option, selected: option.value === criteria.sort }))
    };
  }
}
