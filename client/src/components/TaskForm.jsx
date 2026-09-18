import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_OPTIONS, UPLOAD_HINT } from '../lib.js';
import { controlClass, Field } from './ui.jsx';

export const EMPTY_TASK = Object.freeze({ title: '', description: '', status: 'todo', dueDate: '' });

export const TaskForm = ({ initial, submitLabel, cancelTo, withAttachments, saving, fieldErrors, onSubmit }) => {
  const [values, setValues] = useState(initial);
  const [files, setFiles] = useState([]);

  const change = (field) => (event) => setValues((previous) => ({ ...previous, [field]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    onSubmit(values, files);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field id="title" label="Название" error={fieldErrors.title}>
        <input
          className={controlClass(fieldErrors.title)}
          id="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={change('title')}
        />
      </Field>

      <Field id="description" label="Описание" error={fieldErrors.description}>
        <textarea
          className={controlClass(fieldErrors.description)}
          id="description"
          rows={5}
          maxLength={2000}
          value={values.description}
          onChange={change('description')}
        />
      </Field>

      <div className="field-row">
        <Field id="status" label="Статус" error={fieldErrors.status}>
          <select className={controlClass(fieldErrors.status)} id="status" value={values.status} onChange={change('status')}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="dueDate" label="Ожидаемая дата завершения" error={fieldErrors.dueDate}>
          <input
            className={controlClass(fieldErrors.dueDate)}
            id="dueDate"
            type="date"
            value={values.dueDate}
            onChange={change('dueDate')}
          />
        </Field>
      </div>

      {withAttachments && (
        <Field id="attachments" label="Вложения" error={fieldErrors.attachments} hint={UPLOAD_HINT}>
          <input
            className={controlClass(fieldErrors.attachments)}
            id="attachments"
            type="file"
            multiple
            onChange={(event) => setFiles([...event.target.files])}
          />
        </Field>
      )}

      <div className="form__actions">
        <button className="button button--primary" type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : submitLabel}
        </button>
        <Link className="button" to={cancelTo}>
          Отмена
        </Link>
      </div>
    </form>
  );
};
