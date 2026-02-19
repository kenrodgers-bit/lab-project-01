const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

type Method = 'GET' | 'POST' | 'PATCH';

async function request(path: string, options: { method?: Method; token?: string | null; body?: unknown } = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      throw new Error((data && data.message) || `Request failed (${response.status})`);
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Network error. Check backend connectivity and retry.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  login: (email: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: (token: string) => request('/api/auth/me', { token }),
  bootstrap: (token: string) => request('/api/bootstrap', { token }),

  createUser: (token: string, payload: unknown) => request('/api/users', { method: 'POST', token, body: payload }),
  createDepartment: (token: string, payload: { name: string }) =>
    request('/api/departments', { method: 'POST', token, body: payload }),
  updateUser: (token: string, userId: string, patch: unknown) =>
    request(`/api/users/${encodeURIComponent(userId)}`, { method: 'PATCH', token, body: patch }),
  toggleUserStatus: (token: string, userId: string) =>
    request(`/api/users/${encodeURIComponent(userId)}/toggle-status`, { method: 'POST', token }),
  updatePermissions: (token: string, department: string, patch: unknown) =>
    request(`/api/permissions/${encodeURIComponent(department)}`, { method: 'PATCH', token, body: patch }),

  addInventory: (token: string, payload: unknown) =>
    request('/api/inventory', { method: 'POST', token, body: payload }),
  updateInventory: (token: string, itemId: string, patch: unknown) =>
    request(`/api/inventory/${encodeURIComponent(itemId)}`, { method: 'PATCH', token, body: patch }),

  submitRequest: (token: string, payload: unknown) =>
    request('/api/requests', { method: 'POST', token, body: payload }),
  reviewRequest: (token: string, requestId: string, payload: unknown) =>
    request(`/api/requests/${encodeURIComponent(requestId)}/review`, { method: 'POST', token, body: payload }),

  exportBackup: (token: string) => request('/api/admin/backup/export', { token }),
  importBackup: (token: string, payload: unknown) =>
    request('/api/admin/backup/import', { method: 'POST', token, body: payload }),
  resetData: (token: string) => request('/api/admin/reset', { method: 'POST', token }),
};
