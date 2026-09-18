import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_FILTERS } from './lib.js';

export const useRequest = (load, deps) => {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const version = useRef(0);

  const run = useCallback(async () => {
    const current = ++version.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await load();
      if (current === version.current) {
        setState({ data, error: null, loading: false });
      }
    } catch (error) {
      if (current === version.current) {
        setState({ data: null, error, loading: false });
      }
    }
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const setData = useCallback((data) => setState({ data, error: null, loading: false }), []);

  return { ...state, reload: run, setData };
};

export const toSearchString = (filters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== DEFAULT_FILTERS[key]) {
      params.set(key, value);
    }
  }
  return params.toString();
};

export const useFilters = () => {
  const [params, setParams] = useSearchParams();

  const filters = {
    status: params.get('status') ?? DEFAULT_FILTERS.status,
    search: params.get('search') ?? DEFAULT_FILTERS.search,
    sort: params.get('sort') ?? DEFAULT_FILTERS.sort
  };
  const setFilters = (next) => setParams(toSearchString({ ...filters, ...next }));
  const isDefault = Object.keys(DEFAULT_FILTERS).every((key) => filters[key] === DEFAULT_FILTERS[key]);

  return { filters, setFilters, isDefault };
};
