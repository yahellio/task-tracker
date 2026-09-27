import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSessionExpired, setToken } from './api.js';

const STORAGE_KEY = 'task-tracker.session';

const readStored = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    const stored = readStored();
    setToken(stored?.token ?? null);
    return stored;
  });
  const [ready, setReady] = useState(false);

  const apply = useCallback((value) => {
    setToken(value?.token ?? null);
    setSession(value);
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  }, []);

  useEffect(() => {
    onSessionExpired(() => apply(null));
  }, [apply]);

  useEffect(() => {
    const stored = readStored();
    if (stored === null) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(({ user }) => apply({ ...stored, user }))
      .catch(() => apply(null))
      .finally(() => setReady(true));
  }, [apply]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      ready,
      signIn: async (credentials) => apply(await api.login(credentials)),
      signUp: async (credentials) => apply(await api.register(credentials)),
      signOut: async () => {
        await api.logout().catch(() => null);
        apply(null);
      }
    }),
    [session, ready, apply]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
