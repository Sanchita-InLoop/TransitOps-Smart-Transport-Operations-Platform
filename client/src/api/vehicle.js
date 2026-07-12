import client from './client';

// filters: { status, type }
export async function getVehicles(filters = {}) {
  const { data } = await client.get('/vehicles', { params: filters });
  return data;
}

export async function getVehicle(id) {
  const { data } = await client.get(`/vehicles/${id}`);
  return data;
}

// payload fields confirmed from backend: registration_number, model_name, type,
// max_load_capacity, odometer, acquisition_cost
export async function createVehicle(payload) {
  const { data } = await client.post('/vehicles', payload);
  return data;
}

export async function updateVehicle(id, payload) {
  const { data } = await client.put(`/vehicles/${id}`, payload);
  return data;
}

export async function deleteVehicle(id) {
  const { data } = await client.delete(`/vehicles/${id}`);
  return data;
}
