import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Notice } from './components/ui.jsx';
import { TaskDetailPage } from './pages/TaskDetailPage.jsx';
import { TaskFormPage } from './pages/TaskFormPage.jsx';
import { TaskListPage } from './pages/TaskListPage.jsx';

const Layout = () => (
  <>
    <header className="topbar">
      <Link className="topbar__brand" to="/">
        Трекер задач
      </Link>
      <Link className="button button--primary" to="/tasks/new">
        Новая задача
      </Link>
    </header>
    <main className="shell">
      <Outlet />
    </main>
  </>
);

const NotFoundPage = () => (
  <div className="stack">
    <h1 className="stack__title">Страница не найдена</h1>
    <Notice>Такого адреса в приложении нет.</Notice>
    <p>
      <Link className="button button--primary" to="/">
        Вернуться к списку задач
      </Link>
    </p>
  </div>
);

export const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route index element={<TaskListPage />} />
      <Route path="tasks" element={<Navigate to="/" replace />} />
      <Route path="tasks/new" element={<TaskFormPage />} />
      <Route path="tasks/:id" element={<TaskDetailPage />} />
      <Route path="tasks/:id/edit" element={<TaskFormPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
