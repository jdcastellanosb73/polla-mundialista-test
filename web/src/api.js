// Thin fetch wrapper: injects the Bearer token, parses the API's error envelope
// ({ error: { code, message } }) and expires the session on 401.
// 30 lines that replace an axios dependency.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5180';

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !path.startsWith('/api/auth')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.assign('/login');
    throw { code: 'UNAUTHORIZED', message: 'Sesión expirada' };
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw (data && data.error) || { code: 'UNKNOWN', message: `Error HTTP ${res.status}` };
  }
  return data;
}
