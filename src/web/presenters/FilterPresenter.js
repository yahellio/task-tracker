import { SortOrder, StatusFilter } from '../../application/dto/TaskCriteria.js';
import { TaskStatus } from '../../domain/task/TaskStatus.js';

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

const buildHref = (criteria, overrides) => {
  const params = new URLSearchParams();
  const status = overrides.status ?? criteria.status;
  const sort = overrides.sort ?? criteria.sort;
  const search = overrides.search ?? criteria.search;
  if (status !== StatusFilter.ALL) {
    params.set('status', status);
  }
  if (sort !== SortOrder.DUE_DATE) {
    params.set('sort', sort);
  }
  if (search !== '') {
    params.set('search', search);
  }
  const query = params.toString();
  return query === '' ? '/tasks' : `/tasks?${query}`;
};

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
