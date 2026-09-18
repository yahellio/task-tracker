export const STATUS_META = Object.freeze({
  todo: { label: 'К выполнению', modifier: 'todo' },
  in_progress: { label: 'В работе', modifier: 'in-progress' },
  done: { label: 'Выполнена', modifier: 'done' }
});

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }));

export const QUICK_ACTIONS = Object.freeze({
  todo: [
    { value: 'in_progress', label: 'В работу' },
    { value: 'done', label: 'Выполнено' }
  ],
  in_progress: [
    { value: 'done', label: 'Выполнено' },
    { value: 'todo', label: 'В план' }
  ],
  done: [{ value: 'in_progress', label: 'Вернуть в работу' }]
});

export const FILTER_TABS = Object.freeze([
  { value: 'all', label: 'Все' },
  { value: 'todo', label: 'К выполнению' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Выполнены' },
  { value: 'overdue', label: 'Просрочены' }
]);

export const SORT_OPTIONS = Object.freeze([
  { value: 'dueDate', label: 'По сроку' },
  { value: 'createdAt', label: 'По дате создания' },
  { value: 'title', label: 'По названию' }
]);

export const DEFAULT_FILTERS = Object.freeze({ status: 'all', search: '', sort: 'dueDate' });

export const UPLOAD_HINT = 'До 5 файлов, не более 10 МБ каждый.';

const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
const SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];
const TASK_FORMS = ['задача', 'задачи', 'задач'];

export const formatDate = (isoDate) => DATE_FORMAT.format(new Date(`${isoDate}T00:00:00`));

export const formatDateTime = (iso) => DATE_TIME_FORMAT.format(new Date(iso));

export const formatSize = (bytes) => {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${SIZE_UNITS[unit]}`;
};

export const pluralizeTasks = (count) => {
  const tens = count % 100;
  const ones = count % 10;
  let form = TASK_FORMS[2];
  if (tens < 11 || tens > 19) {
    if (ones === 1) {
      form = TASK_FORMS[0];
    } else if (ones > 1 && ones < 5) {
      form = TASK_FORMS[1];
    }
  }
  return `${count} ${form}`;
};

export const extensionOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1, dot + 5) : 'файл';
};
