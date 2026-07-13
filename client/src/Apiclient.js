'use strict';

// Change this once you have a deployed backend — e.g.
// 'https://transitops-api.onrender.com/api'. Keeping it as a plain
// constant avoids CRA vs Vite env-var naming differences.
const API_BASE_URL = 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('transitops_token');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response (e.g. a bare 502 while a free-tier host cold-starts).
  }

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { API_BASE_URL };