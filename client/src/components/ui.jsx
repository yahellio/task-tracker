import { STATUS_META } from '../lib.js';

export const Notice = ({ children }) => <p className="notice">{children}</p>;

export const Loading = () => <p className="hint">Загрузка…</p>;

export const controlClass = (error) => `field__control${error ? ' field__control--invalid' : ''}`;

export const Field = ({ id, label, error, hint, children }) => (
  <div className="field">
    <label className="field__label" htmlFor={id}>
      {label}
    </label>
    {children}
    {error && <p className="field__error">{error}</p>}
    {hint && <p className="field__hint">{hint}</p>}
  </div>
);

export const StatusBadge = ({ status }) => (
  <span className={`badge badge--${STATUS_META[status].modifier}`}>{STATUS_META[status].label}</span>
);

export const OverdueBadge = () => <span className="badge badge--overdue">Просрочена</span>;
