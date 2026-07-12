import db from '../config/db.js';
const { pool } = db;

// 1. Fetch all drivers
export const getDrivers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drivers ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drivers from the database.' });
  }
};

// 2. Create a new driver profile
export const createDriver = async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, license_number, license_category, license_expiry_date, contact_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation code (e.g. duplicate license)
      return res.status(400).json({ error: 'A driver with this license number already exists.' });
    }
    res.status(500).json({ error: 'Failed to create driver profile.' });
  }
};

// 3. Update driver operational status
export const updateDriverStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; 

  try {
    const result = await pool.query(
      'UPDATE drivers SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update driver status.' });
  }
};