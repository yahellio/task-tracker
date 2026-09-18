import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { EMPTY_TASK, TaskForm } from '../components/TaskForm.jsx';
import { Loading, Notice } from '../components/ui.jsx';
import { useRequest } from '../hooks.js';

const toFormValues = (task) => ({
  title: task.title,
  description: task.description,
  status: task.status,
  dueDate: task.dueDate ?? ''
});

export const TaskFormPage = () => {
  const { id } = useParams();
  const isEdit = id !== undefined;
  const navigate = useNavigate();
  const { data: task, error, loading } = useRequest(() => (isEdit ? api.get(id) : Promise.resolve(null)), [id]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const save = async (values, files) => {
    setSaving(true);
    setFieldErrors({});
    setFormError(null);
    let saved = null;
    try {
      saved = isEdit ? await api.update(id, values) : await api.create(values);
      if (files.length > 0) {
        await api.upload(saved.id, files);
      }
      navigate(`/tasks/${saved.id}`);
    } catch (failure) {
      if (saved) {
        navigate(`/tasks/${saved.id}`, { state: { error: `Задача сохранена, но файлы не загружены: ${failure.message}` } });
        return;
      }
      setFieldErrors(failure.fields ?? {});
      setFormError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  const backTo = isEdit ? `/tasks/${id}` : '/';

  if (loading) {
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
        <Link className="backlink" to={backTo}>
          {isEdit ? '← К карточке задачи' : '← К списку задач'}
        </Link>
      </p>
      <h1 className="stack__title">{isEdit ? 'Редактирование задачи' : 'Новая задача'}</h1>

      {formError && <Notice>{formError}</Notice>}

      <div className="card">
        <TaskForm
          key={id ?? 'new'}
          initial={task ? toFormValues(task) : EMPTY_TASK}
          submitLabel={isEdit ? 'Сохранить' : 'Создать задачу'}
          cancelTo={backTo}
          withAttachments={!isEdit}
          saving={saving}
          fieldErrors={fieldErrors}
          onSubmit={save}
        />
      </div>
    </div>
  );
};
