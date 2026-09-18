import { useState } from 'react';
import { api } from '../api.js';
import { FilterSidebar } from '../components/FilterSidebar.jsx';
import { TaskCard } from '../components/TaskCard.jsx';
import { Loading, Notice } from '../components/ui.jsx';
import { useFilters, useRequest } from '../hooks.js';
import { pluralizeTasks } from '../lib.js';

export const TaskListPage = () => {
  const { filters, setFilters, isDefault } = useFilters();
  const { data, error, loading, reload } = useRequest(() => api.list(filters), [filters.status, filters.search, filters.sort]);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const perform = async (task, action) => {
    setBusyId(task.id);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = (task, status) => perform(task, () => api.changeStatus(task.id, status));

  const remove = (task) => {
    if (window.confirm(`Удалить задачу «${task.title}»?`)) {
      perform(task, () => api.remove(task.id));
    }
  };

  return (
    <div className="workspace">
      <FilterSidebar filters={filters} summary={data?.summary} isDefault={isDefault} onChange={setFilters} />

      <div className="content">
        <header className="content__header">
          <h1 className="content__title">Задачи</h1>
          {data && <p className="content__subtitle">Найдено: {pluralizeTasks(data.items.length)}</p>}
        </header>

        {actionError && <Notice>{actionError}</Notice>}
        {error && <Notice>{error.message}</Notice>}
        {loading && !data && <Loading />}

        {data?.items.length === 0 && (
          <p className="empty">Задач не найдено. Измените условия отбора или создайте новую задачу.</p>
        )}

        {data?.items.length > 0 && (
          <ul className="task-list">
            {data.items.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={busyId === task.id}
                onChangeStatus={changeStatus}
                onRemove={remove}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
