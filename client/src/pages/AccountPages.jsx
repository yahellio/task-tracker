import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Loading, Notice } from '../components/ui.jsx';
import { useRequest } from '../hooks.js';
import { ROLE_LABELS, ROLE_OPTIONS, formatDateTime } from '../lib.js';

export const AccountPage = () => {
  const { user } = useAuth();
  const { data: sessions, error, loading, reload } = useRequest(() => api.listSessions(), []);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const perform = async (action) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <h1 className="stack__title">Учётная запись</h1>

      <div className="card">
        <dl className="detail__facts">
          <div className="detail__fact">
            <dt>Электронная почта</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="detail__fact">
            <dt>Роль</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
          </div>
        </dl>
      </div>

      <section className="attachments">
        <h2 className="attachments__title">Активные подключения</h2>
        <p className="hint">
          Каждый вход выдаёт временный ключ доступа. Завершите подключение, если не узнаёте устройство.
        </p>

        {actionError && <Notice>{actionError}</Notice>}
        {error && <Notice>{error.message}</Notice>}
        {loading && !sessions && <Loading />}

        {sessions && (
          <ul className="attachment-list">
            {sessions.map((session) => (
              <li key={session.id} className="attachment">
                <span className="attachment__body">
                  <span className="attachment__name">
                    {session.current ? 'Текущее подключение' : 'Другое подключение'}
                  </span>
                  <span className="attachment__meta">
                    {session.userAgent || 'Неизвестное устройство'} · вход {formatDateTime(session.createdAt)} · ключ
                    действует до {formatDateTime(session.expiresAt)}
                  </span>
                </span>
                {!session.current && (
                  <button
                    className="button button--small button--danger"
                    type="button"
                    disabled={busy}
                    onClick={() => perform(() => api.revokeSession(session.id))}
                  >
                    Завершить
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {sessions && sessions.length > 1 && (
          <div className="form__actions">
            <button
              className="button button--danger"
              type="button"
              disabled={busy}
              onClick={() => perform(() => api.revokeOtherSessions())}
            >
              Завершить все, кроме текущего
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export const UsersPage = () => {
  const { user } = useAuth();
  const { data: users, error, loading, reload } = useRequest(() => api.listUsers(), []);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const changeRole = async (target, role) => {
    setBusyId(target.id);
    setActionError(null);
    try {
      await api.changeRole(target.id, role);
      await reload();
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack">
      <h1 className="stack__title">Пользователи</h1>
      <p className="hint">
        Роль определяет доступ: пользователь работает со своими задачами, менеджер видит и правит все, администратор
        дополнительно управляет ролями и подключениями.
      </p>

      {actionError && <Notice>{actionError}</Notice>}
      {error && <Notice>{error.message}</Notice>}
      {loading && !users && <Loading />}

      {users && (
        <ul className="attachment-list">
          {users.map((item) => (
            <li key={item.id} className="attachment">
              <span className="attachment__body">
                <span className="attachment__name">{item.email}</span>
                <span className="attachment__meta">Зарегистрирован {formatDateTime(item.createdAt)}</span>
              </span>
              <select
                className="field__control field__control--inline"
                value={item.role}
                disabled={busyId === item.id || item.id === user.id}
                onChange={(event) => changeRole(item, event.target.value)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
