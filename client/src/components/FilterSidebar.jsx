import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toSearchString } from '../hooks.js';
import { FILTER_TABS, SORT_OPTIONS } from '../lib.js';

export const FilterSidebar = ({ filters, summary, isDefault, onChange }) => {
  const [search, setSearch] = useState(filters.search);
  const [sort, setSort] = useState(filters.sort);

  useEffect(() => {
    setSearch(filters.search);
    setSort(filters.sort);
  }, [filters.search, filters.sort]);

  const submit = (event) => {
    event.preventDefault();
    onChange({ search: search.trim(), sort });
  };

  return (
    <aside className="sidebar">
      <section className="panel">
        <h2 className="panel__title">Статус</h2>
        <nav className="statusnav">
          {FILTER_TABS.map((tab) => (
            <Link
              key={tab.value}
              className={`statusnav__item${tab.value === filters.status ? ' statusnav__item--active' : ''}`}
              to={{ search: toSearchString({ ...filters, status: tab.value }) }}
            >
              <span>{tab.label}</span>
              <span className="statusnav__count">{summary ? summary[tab.value] : '…'}</span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="panel">
        <h2 className="panel__title">Поиск и сортировка</h2>
        <form className="panel__form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="search">
              Поиск
            </label>
            <input
              className="field__control"
              id="search"
              type="search"
              placeholder="Название или описание"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="sort">
              Сортировка
            </label>
            <select className="field__control" id="sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button className="button button--primary button--block" type="submit">
            Применить
          </button>
          {!isDefault && (
            <Link className="button button--quiet button--block" to="/">
              Сбросить фильтры
            </Link>
          )}
        </form>
      </section>
    </aside>
  );
};
