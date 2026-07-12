import client from './client';

export async function login({ email, password }) {
  const { data } = await client.post('/auth/login', { email, password });
  // data is already unwrapped by the client.js interceptor to: { token, user }
  return data;
}

export async function register({ name, email, password, role }) {
  const { data } = await client.post('/auth/register', { name, email, password, role });
  return data;
}
