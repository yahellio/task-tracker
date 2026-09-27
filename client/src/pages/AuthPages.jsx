import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Field, Notice, controlClass } from '../components/ui.jsx';
import { useAuth } from '../auth.jsx';

const AuthCard = ({ title, error, children, footer }) => (
  <div className="stack stack--narrow">
    <h1 className="stack__title">{title}</h1>
    {error && <Notice>{error}</Notice>}
    <div className="card">{children}</div>
    {footer && <p className="hint">{footer}</p>}
  </div>
);

const useSubmit = (action) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await action();
    } catch (failure) {
      setError(failure.message);
      setFields(failure.fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, fields, submit };
};

export const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, fields, submit } = useSubmit(async () => {
    await signIn({ email, password });
    navigate(location.state?.from ?? '/');
  });

  return (
    <AuthCard
      title="Вход"
      error={error}
      footer={
        <>
          <Link to="/register">Создать учётную запись</Link> · <Link to="/forgot-password">Забыли пароль?</Link>
        </>
      }
    >
      <form className="form" onSubmit={submit} noValidate>
        <Field id="email" label="Электронная почта" error={fields.email}>
          <input
            className={controlClass(fields.email)}
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field id="password" label="Пароль" error={fields.password}>
          <input
            className={controlClass(fields.password)}
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <div className="form__actions">
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Входим…' : 'Войти'}
          </button>
        </div>
      </form>
    </AuthCard>
  );
};

export const RegisterPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, fields, submit } = useSubmit(async () => {
    await signUp({ email, password });
    navigate('/');
  });

  return (
    <AuthCard title="Регистрация" error={error} footer={<Link to="/login">Уже есть учётная запись</Link>}>
      <form className="form" onSubmit={submit} noValidate>
        <Field id="email" label="Электронная почта" error={fields.email}>
          <input
            className={controlClass(fields.email)}
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field id="password" label="Пароль" error={fields.password} hint="Не менее 8 символов.">
          <input
            className={controlClass(fields.password)}
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <div className="form__actions">
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Создаём…' : 'Зарегистрироваться'}
          </button>
        </div>
      </form>
    </AuthCard>
  );
};

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, error, fields, submit } = useSubmit(async () => {
    await api.requestPasswordReset(email);
    setSent(true);
  });

  return (
    <AuthCard title="Восстановление доступа" error={error} footer={<Link to="/login">Вернуться ко входу</Link>}>
      {sent ? (
        <p className="hint">Если адрес зарегистрирован, на него отправлено письмо со ссылкой для смены пароля.</p>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <Field id="email" label="Электронная почта" error={fields.email}>
            <input
              className={controlClass(fields.email)}
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <div className="form__actions">
            <button className="button button--primary" type="submit" disabled={busy}>
              {busy ? 'Отправляем…' : 'Отправить ссылку'}
            </button>
          </div>
        </form>
      )}
    </AuthCard>
  );
};

export const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const { busy, error, fields, submit } = useSubmit(async () => {
    await api.confirmPasswordReset({ token: params.get('token') ?? '', password });
    navigate('/login');
  });

  return (
    <AuthCard title="Новый пароль" error={error} footer={<Link to="/login">Вернуться ко входу</Link>}>
      <form className="form" onSubmit={submit} noValidate>
        <Field id="password" label="Новый пароль" error={fields.password ?? fields.token} hint="Не менее 8 символов.">
          <input
            className={controlClass(fields.password ?? fields.token)}
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <div className="form__actions">
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить пароль'}
          </button>
        </div>
      </form>
    </AuthCard>
  );
};
