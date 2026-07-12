/**
 * api/client.js
 * Central fetch wrapper. Automatically attaches the JWT from localStorage
 * and returns parsed JSON. Throws on non-2xx responses with the server's
 * error message surfaced cleanly.
 */

const BASE = '/api';

function getToken() {
  return localStorage.getItem('transitops_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({ success: false, message: 'Unexpected server response' }));

  if (!res.ok) {
    // Surface the backend's message (e.g. "Driver not found.", "Only a 'draft' trip can be dispatched")
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.fieldErrors = json.fieldErrors ?? null;
    throw err;
  }

  return json.data;
}

export const api = {
  get:    (path)         => request(path, { method: 'GET' }),
  post:   (path, body)   => request(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  (path, body)   => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
};
