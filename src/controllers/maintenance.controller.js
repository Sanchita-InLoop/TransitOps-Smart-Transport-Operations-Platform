const { query, getClient } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const { vehicle_id, description, cost } = req.body;
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const logResult = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, description, cost) 
       VALUES ($1, $2, $3) RETURNING *`,
      [vehicle_id, description, cost]
    );
    
    await client.query(
      `UPDATE vehicles SET status = 'in_shop' WHERE id = $1`,
      [vehicle_id]
    );
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: logResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err; 
  } finally {
    client.release();
  }
});

const close = catchAsync(async (req, res) => {
  const { id } = req.params;
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const logResult = await client.query(
      `UPDATE maintenance_logs 
       SET closed_at = now(), status = 'closed'
       WHERE id = $1 AND closed_at IS NULL 
       RETURNING *`,
      [id]
    );
    
    if (logResult.rows.length === 0) {
      throw ApiError.notFound('Maintenance log not found or already closed');
    }
    
    const vehicleId = logResult.rows[0].vehicle_id;
    
    const vehicleResult = await client.query(
      'SELECT status FROM vehicles WHERE id = $1', 
      [vehicleId]
    );
    
    if (vehicleResult.rows[0] && vehicleResult.rows[0].status !== 'retired') {
      await client.query(
        `UPDATE vehicles SET status = 'available' WHERE id = $1`,
        [vehicleId]
      );
    }
    
    await client.query('COMMIT');
    res.status(200).json({ success: true, data: logResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const getAll = catchAsync(async (req, res) => {
  const { vehicle_id } = req.query;
  let sql = 'SELECT * FROM maintenance_logs';
  const params = [];
  
  if (vehicle_id) {
    params.push(vehicle_id);
    sql += ' WHERE vehicle_id = $1';
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const result = await query(sql, params);
  res.status(200).json({ success: true, data: result.rows });
});

const getById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await query('SELECT * FROM maintenance_logs WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    throw ApiError.notFound('Maintenance log not found');
  }
  
  res.status(200).json({ success: true, data: result.rows[0] });
});

// The foolproof export
module.exports = {
  create,
  close,
  getAll,
  getById
};