const BASE_URL = '/api';

class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

let token = null;
let onUnauthorized = () => {};

export const setToken = (value) => {
  token = value;
};

export const onSessionExpired = (handler) => {
  onUnauthorized = handler;
};

const send = async (path, { method = 'GET', body, auth = true } = {}) => {
  const init = { method, headers: {} };

  if (auth && token !== null) {
    init.headers.Authorization = `Bearer ${token}`;
  }
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, 'Не удалось связаться с сервером');
  }

  if (response.ok) {
    return response;
  }

  if (response.status === 401 && auth) {
    onUnauthorized();
  }
  const { error } = (await response.json().catch(() => null)) ?? {};
  const fallback = response.status >= 500 ? 'Сервер недоступен, попробуйте позже' : `Ошибка запроса (${response.status})`;
  throw new ApiError(response.status, error?.message ?? fallback, error?.fields ?? {});
};

const request = async (path, options) => {
  const response = await send(path, options);
  return response.status === 204 ? null : response.json();
};

const toQuery = (filters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '') {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
};

export const api = {
  register: (credentials) => request('/auth/register', { method: 'POST', body: credentials, auth: false }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  requestPasswordReset: (email) => request('/auth/password-reset', { method: 'POST', body: { email }, auth: false }),
  confirmPasswordReset: (body) => request('/auth/password-reset/confirm', { method: 'POST', body, auth: false }),

  listSessions: () => request('/sessions'),
  revokeSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  revokeOtherSessions: () => request('/sessions', { method: 'DELETE' }),

  listUsers: () => request('/users'),
  changeRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: { role } }),

  list: (filters) => request(`/tasks${toQuery(filters)}`),
  get: (id) => request(`/tasks/${id}`),
  create: (input) => request('/tasks', { method: 'POST', body: input }),
  update: (id, input) => request(`/tasks/${id}`, { method: 'PUT', body: input }),
  changeStatus: (id, status) => request(`/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  upload: (id, files) => {
    const form = new FormData();
    for (const file of files) {
      form.append('attachments', file);
    }
    return request(`/tasks/${id}/attachments`, { method: 'POST', body: form });
  },
  removeAttachment: (id, attachmentId) => request(`/tasks/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),

  downloadAttachment: async (id, attachmentId, name) => {
    const response = await send(`/tasks/${id}/attachments/${attachmentId}`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
};
