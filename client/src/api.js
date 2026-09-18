const BASE_URL = '/api/tasks';

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

const request = async (url, { method = 'GET', body } = {}) => {
  const init = { method, headers: {} };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0, 'Не удалось связаться с сервером');
  }

  if (response.status === 204) {
    return null;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    const fallback = response.status >= 500 ? 'Сервер недоступен, попробуйте позже' : `Ошибка запроса (${response.status})`;
    throw new ApiError(response.status, error?.message ?? fallback, error?.fields ?? {});
  }
  return payload;
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
  list: (filters) => request(`${BASE_URL}${toQuery(filters)}`),
  get: (id) => request(`${BASE_URL}/${id}`),
  create: (input) => request(BASE_URL, { method: 'POST', body: input }),
  update: (id, input) => request(`${BASE_URL}/${id}`, { method: 'PUT', body: input }),
  changeStatus: (id, status) => request(`${BASE_URL}/${id}/status`, { method: 'PATCH', body: { status } }),
  remove: (id) => request(`${BASE_URL}/${id}`, { method: 'DELETE' }),
  upload: (id, files) => {
    const form = new FormData();
    for (const file of files) {
      form.append('attachments', file);
    }
    return request(`${BASE_URL}/${id}/attachments`, { method: 'POST', body: form });
  },
  removeAttachment: (id, attachmentId) => request(`${BASE_URL}/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
  attachmentUrl: (id, attachmentId) => `${BASE_URL}/${id}/attachments/${attachmentId}`
};
