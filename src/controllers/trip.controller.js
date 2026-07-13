'use strict';

const db = require('../config/db');

/**
 * 1. List all trips with optional filtering
 */
const listTrips = async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM trips';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    const { rows } = await db.query(query, params);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch trips', details: error.message });
  }
};

/**
 * 2. Create a draft trip (Basic capacity validation)
 */
const createTrip = async (req, res) => {
  const client = await db.getClient();
  try {
    const { vehicleId, cargoWeight, origin, destination } = req.body;

    await client.query('BEGIN');

    // Atomic check for vehicle existence and weight capacity
    const vehicleRes = await client.query(
      'SELECT max_weight_capacity FROM vehicles WHERE id = $1 FOR SHARE',
      [vehicleId]
    );

    if (vehicleRes.rows.length === 0) {
      throw new Error('Vehicle not found');
    }

    if (cargoWeight > vehicleRes.rows[0].max_weight_capacity) {
      throw new Error('Cargo weight exceeds vehicle capacity');
    }

    const insertQuery = `
      INSERT INTO trips (vehicle_id, cargo_weight, origin, destination, status)
      VALUES ($1, $2, $3, $4, 'draft')
      RETURNING *
    `;
    const { rows } = await client.query(insertQuery, [vehicleId, cargoWeight, origin, destination]);
    
    await client.query('COMMIT');
    return res.status(201).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
};

/**
 * 3. Dispatch a trip (Atomic locking: No double-booking, verifies license expiry)
 */
const dispatchTrip = async (req, res) => {
  const { id } = req.params;
  const { driverId } = req.body;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock the trip and ensure it's in 'draft' status
    const tripRes = await client.query(
      'SELECT * FROM trips WHERE id = $1 AND status = \'draft\' FOR UPDATE',
      [id]
    );
    if (tripRes.rows.length === 0) {
      throw new Error('Trip not found or not in draft status');
    }

    // 2. Lock driver and check license expiry
    const driverRes = await client.query(
      'SELECT license_expiry_date FROM drivers WHERE id = $1 FOR SHARE',
      [driverId]
    );
    if (driverRes.rows.length === 0) {
      throw new Error('Driver not found');
    }
    if (new Date(driverRes.rows[0].license_expiry_date) < new Date()) {
      throw new Error('Cannot dispatch: Driver license has expired');
    }

    // 3. Prevent double-booking (Check if driver is already on an active trip)
    const activeTripRes = await client.query(
      'SELECT id FROM trips WHERE driver_id = $1 AND status = \'dispatched\' FOR SHARE',
      [driverId]
    );
    if (activeTripRes.rows.length > 0) {
      throw new Error('Driver is already assigned to an active dispatched trip');
    }

    // 4. Update the trip to dispatched
    const updateQuery = `
      UPDATE trips 
      SET driver_id = $1, status = 'dispatched', dispatched_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `;
    const { rows } = await client.query(updateQuery, [driverId, id]);

    await client.query('COMMIT');
    return res.status(200).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
};

/**
 * 4. Complete a trip
 */
const completeTrip = async (req, res) => {
  const { id } = req.params;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const tripRes = await client.query(
      'SELECT id FROM trips WHERE id = $1 AND status = \'dispatched\' FOR UPDATE',
      [id]
    );
    if (tripRes.rows.length === 0) {
      throw new Error('Trip not found or cannot be completed (must be dispatched)');
    }

    const { rows } = await client.query(
      'UPDATE trips SET status = \'completed\', completed_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');
    return res.status(200).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
};

/**
 * 5. Cancel a trip
 */
const cancelTrip = async (req, res) => {
  const { id } = req.params;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Trips can only be cancelled if they aren't already finalized (completed/cancelled)
    const tripRes = await client.query(
      'SELECT status FROM trips WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (tripRes.rows.length === 0) {
      throw new Error('Trip not found');
    }
    if (['completed', 'cancelled'].includes(tripRes.rows[0].status)) {
      throw new Error(`Cannot cancel a trip that is already ${tripRes.rows[0].status}`);
    }

    const { rows } = await client.query(
      'UPDATE trips SET status = \'cancelled\', cancelled_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');
    return res.status(200).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { listTrips, createTrip, dispatchTrip, completeTrip, cancelTrip };