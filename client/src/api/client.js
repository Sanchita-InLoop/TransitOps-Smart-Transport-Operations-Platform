import axios from 'axios';

// Single source of truth for the backend base URL.
export const API_BASE_URL = 'http://localhost:4000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the auth token (if present) to every outgoing request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('transitops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Your backend wraps every response as { success, data } (confirmed via Postman:
// POST /auth/register, GET /vehicles/:id, POST /maintenance-logs all follow this
// shape). This interceptor unwraps `data` so the rest of the app never has to
// write `response.data.data` — components just get the real payload back.
client.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data;

    // Auto-logout on 401 so a stale/expired token doesn't cause silent failures
    // across every subsequent request.
    if (status === 401) {
      localStorage.removeItem('transitops_token');
      localStorage.removeItem('transitops_user');
    }

    const normalized = new Error(
      body?.message || body?.error || error.message || 'Something went wrong. Please try again.'
    );
    normalized.status = status;
    // Adjust this if your Zod validation middleware shapes field errors differently.
    normalized.fieldErrors = body?.fieldErrors || body?.errors || null;

    return Promise.reject(normalized);
  }
);

export default client;
