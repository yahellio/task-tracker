import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { Loading, Notice } from './components/ui.jsx';
import { AccountPage, UsersPage } from './pages/AccountPages.jsx';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages.jsx';
import { TaskDetailPage } from './pages/TaskDetailPage.jsx';
import { TaskFormPage } from './pages/TaskFormPage.jsx';
import { TaskListPage } from './pages/TaskListPage.jsx';
import { ROLE_LABELS, canManageUsers } from './lib.js';

const Layout = () => {
  const { user, signOut } = useAuth();

  return (
    <>
      <header className="topbar">
        <Link className="topbar__brand" to="/">
          Трекер задач
        </Link>
        {user && (
          <nav className="topbar__nav">
            <Link className="button button--quiet button--small" to="/account">
              {user.email} · {ROLE_LABELS[user.role]}
            </Link>
            {canManageUsers(user) && (
              <Link className="button button--quiet button--small" to="/users">
                Пользователи
              </Link>
            )}
            <Link className="button button--primary" to="/tasks/new">
              Новая задача
            </Link>
            <button className="button button--small" type="button" onClick={signOut}>
              Выйти
            </button>
          </nav>
        )}
      </header>
      <main className="shell">
        <Outlet />
      </main>
    </>
  );
};

const RequireAuth = () => {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <Loading />;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
};

const RequireAdmin = () => {
  const { user } = useAuth();
  return canManageUsers(user) ? <Outlet /> : <Notice>Недостаточно прав для просмотра этого раздела.</Notice>;
};

const GuestOnly = () => {
  const { user, ready } = useAuth();

  if (!ready) {
    return <Loading />;
  }
  return user ? <Navigate to="/" replace /> : <Outlet />;
};

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
      <Route element={<GuestOnly />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route index element={<TaskListPage />} />
        <Route path="tasks" element={<Navigate to="/" replace />} />
        <Route path="tasks/new" element={<TaskFormPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="tasks/:id/edit" element={<TaskFormPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route element={<RequireAdmin />}>
          <Route path="users" element={<UsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
