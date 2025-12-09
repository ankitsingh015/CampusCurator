// Lightweight API client to talk to your existing Express backend using JWT auth.
// Usage: api.get('/drives'), api.post('/auth/login', body), etc.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';

function getActiveRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cc_active_role');
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cc_token');
}

function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('cc_token', token);
  else localStorage.removeItem('cc_token');
}

async function request(method, path, { body, qs, headers } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  if (qs && typeof qs === 'object') {
    Object.keys(qs).forEach(k => qs[k] != null && url.searchParams.append(k, qs[k]));
  }

  const token = getToken();
  const activeRole = getActiveRole();
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeRole ? { 'X-Active-Role': activeRole } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });

  const contentType = res.headers.get('content-type') || '';
  const isJSON = contentType.includes('application/json');
  const payload = isJSON ? await res.json() : await res.text();

  if (!res.ok) {
    const err = new Error(payload && payload.message ? payload.message : 'API Error');
    err.status = res.status;
    err.data = payload;
    throw err;
  }
  return payload;
}

export const api = {
  setToken,
  getActiveRole,
  getToken,
  get: (path, opts) => request('GET', path, opts),
  post: (path, opts) => request('POST', path, opts),
  put: (path, opts) => request('PUT', path, opts),
  del: (path, opts) => request('DELETE', path, opts)
};