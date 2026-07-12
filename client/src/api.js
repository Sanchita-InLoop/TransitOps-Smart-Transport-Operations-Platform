const BASE_URL = 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Request failed');
  }
  return json.data;
}