import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { controlClass, Field, Loading, Notice, OverdueBadge, StatusBadge } from '../components/ui.jsx';
import { useRequest } from '../hooks.js';
import { extensionOf, formatDate, formatDateTime, formatSize, STATUS_META, STATUS_OPTIONS, UPLOAD_HINT } from '../lib.js';

export const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: task, error, loading, setData } = useRequest(() => api.get(id), [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(location.state?.error ?? null);
  const [fileError, setFileError] = useState(null);
  const fileInput = useRef(null);

  const perform = async (action) => {
    setBusy(true);
    setActionError(null);
    setFileError(null);
    try {
      return await action();
    } catch (failure) {
      setActionError(failure.message);
      setFileError(failure.fields?.attachments ?? null);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    const updated = await perform(() => api.changeStatus(task.id, status));
    if (updated) {
      setData(updated);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Удалить задачу «${task.title}»?`)) {
      return;
    }
    const done = await perform(() => api.remove(task.id).then(() => true));
    if (done) {
      navigate('/');
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    const updated = await perform(() => api.upload(task.id, [...fileInput.current.files]));
    if (updated) {
      setData(updated);
      fileInput.current.value = '';
    }
  };

  const removeAttachment = async (attachment) => {
    const done = await perform(() => api.removeAttachment(task.id, attachment.id).then(() => true));
    if (done) {
      setData({ ...task, attachments: task.attachments.filter((item) => item.id !== attachment.id) });
    }
  };

  if (loading && !task) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="stack">
        <Notice>{error.message}</Notice>
        <p>
          <Link className="button" to="/">
            ← К списку задач
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <p>
        <Link className="backlink" to="/">
          ← К списку задач
        </Link>
      </p>

      {actionError && <Notice>{actionError}</Notice>}

      <article className={`card detail detail--${STATUS_META[task.status].modifier}`}>
        <header className="detail__header">
          <h1 className="detail__title">{task.title}</h1>
          <StatusBadge status={task.status} />
          {task.isOverdue && <OverdueBadge />}
        </header>

        <dl className="detail__facts">
          <div className={`detail__fact${task.isOverdue ? ' detail__fact--overdue' : ''}`}>
            <dt>Ожидаемое завершение</dt>
            <dd>{task.dueDate ? formatDate(task.dueDate) : 'Без срока'}</dd>
          </div>
          <div className="detail__fact">
            <dt>Создана</dt>
            <dd>{formatDateTime(task.createdAt)}</dd>
          </div>
          <div className="detail__fact">
            <dt>Обновлена</dt>
            <dd>{formatDateTime(task.updatedAt)}</dd>
          </div>
        </dl>

        {task.description ? (
          <p className="detail__description">{task.description}</p>
        ) : (
          <p className="hint">Описание не заполнено.</p>
        )}

        <div className="detail__toolbar">
          <span className="detail__toolbar-label">Статус:</span>
          <div className="button-row">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`button button--small ${
                  option.value === task.status ? 'button--primary' : `button--status-${STATUS_META[option.value].modifier}`
                }`}
                type="button"
                disabled={busy || option.value === task.status}
                onClick={() => changeStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="detail__toolbar-spacer" />
          <Link className="button button--small" to={`/tasks/${task.id}/edit`}>
            Изменить
          </Link>
          <button className="button button--small button--danger" type="button" disabled={busy} onClick={remove}>
            Удалить задачу
          </button>
        </div>
      </article>

      <section className="attachments">
        <h2 className="attachments__title">Вложения · {task.attachments.length}</h2>

        {task.attachments.length === 0 ? (
          <p className="hint">Файлы ещё не прикреплены.</p>
        ) : (
          <ul className="attachment-list">
            {task.attachments.map((attachment) => (
              <li key={attachment.id} className="attachment">
                <span className="attachment__icon">{extensionOf(attachment.name)}</span>
                <span className="attachment__body">
                  <a className="attachment__name" href={api.attachmentUrl(task.id, attachment.id)}>
                    {attachment.name}
                  </a>
                  <span className="attachment__meta">
                    {formatSize(attachment.size)} · {formatDateTime(attachment.uploadedAt)}
                  </span>
                </span>
                <button
                  className="button button--small button--danger"
                  type="button"
                  disabled={busy}
                  onClick={() => removeAttachment(attachment)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="card upload" onSubmit={upload}>
          <div className="upload__row">
            <Field id="upload" label="Прикрепить файлы" error={fileError}>
              <input className={controlClass(fileError)} id="upload" type="file" multiple ref={fileInput} />
            </Field>
            <button className="button button--primary" type="submit" disabled={busy}>
              Загрузить
            </button>
          </div>
          <p className="field__hint">{UPLOAD_HINT}</p>
        </form>
      </section>
    </div>
  );
};
