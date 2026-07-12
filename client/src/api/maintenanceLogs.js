import client from './client';

// filters: { status } e.g. 'open' | 'closed', or { vehicle_id }
export async function getMaintenanceLogs(filters = {}) {
  const { data } = await client.get('/maintenance-logs', { params: filters });
  return data;
}

export async function getMaintenanceLog(id) {
  const { data } = await client.get(`/maintenance-logs/${id}`);
  return data;
}

// Confirmed via Postman: opening a log takes { vehicle_id, description, cost }
// and the backend transactionally flips the vehicle to 'in_shop' (unless retired).
export async function openMaintenanceLog({ vehicle_id, description, cost }) {
  const { data } = await client.post('/maintenance-logs', { vehicle_id, description, cost });
  return data;
}

// Adjust the payload/endpoint here if your backend uses a different route or
// body shape for closing a log (e.g. PATCH with { status: 'closed' }) — this
// assumes a PUT since that matches the CRUD pattern of your Vehicle API.
export async function closeMaintenanceLog(id, payload = { status: 'closed' }) {
  const { data } = await client.put(`/maintenance-logs/${id}`, payload);
  return data;
}
