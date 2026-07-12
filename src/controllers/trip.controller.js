import pool from '../config/db.js';

const VALID_TRIP_STATUSES = ['draft', 'dispatched', 'completed', 'cancelled'];

/**
 * GET /api/trips
 * Joins in the driver's name and the vehicle's registration number so the
 * UI doesn't need a second round-trip per row. Assumes a `vehicles` table
 * with a `registration_number` column — adjust the alias below if your
 * schema names it differently.
 */
export const getTrips = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.vehicle_id, t.driver_id, t.source, t.destination, t.cargo_weight,
              t.planned_distance, t.actual_distance, t.fuel_consumed, t.status,
              t.created_at, t.completed_at,
              d.name AS driver_name,
              v.registration_number AS vehicle_registration
       FROM trips t
       INNER JOIN drivers d ON d.id = t.driver_id
       INNER JOIN vehicles v ON v.id = t.vehicle_id
       ORDER BY t.created_at DESC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[getTrips]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch trips.' });
  }
};

/**
 * POST /api/trips
 * Creates a trip that goes straight to 'dispatched' (per spec), instead
 * of the two-step draft -> dispatch flow. Because a single-step dispatch
 * skips the separate validation endpoint, ALL the eligibility checks that
 * would normally guard a dispatch (capacity, availability, license
 * expiry) are enforced right here, inside one locked transaction, so a
 * trip can never be created 'dispatched' against an unfit vehicle/driver
 * or leave the fleet's status out of sync.
 */
export const createTrip = async (req, res) => {
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance } = req.body;

  if (!vehicle_id || !driver_id || !source || !destination || cargo_weight == null || planned_distance == null) {
    return res.status(400).json({
      success: false,
      message: 'vehicle_id, driver_id, source, destination, cargo_weight, and planned_distance are all required.',
    });
  }
  if (Number(cargo_weight) <= 0 || Number(planned_distance) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'cargo_weight and planned_distance must be positive numbers.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the vehicle and driver rows for the duration of this
    // transaction so two concurrent requests can't both dispatch the
    // same asset before either commits.
    const vehicleResult = await client.query(
      'SELECT id, max_load_capacity, status FROM vehicles WHERE id = $1 FOR UPDATE',
      [vehicle_id]
    );
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'The specified vehicle does not exist.' });
    }
    if (vehicle.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Vehicle is not available for dispatch (current status: '${vehicle.status}').`,
      });
    }
    if (Number(cargo_weight) > Number(vehicle.max_load_capacity)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cargo weight (${cargo_weight}) exceeds this vehicle's max load capacity (${vehicle.max_load_capacity}).`,
      });
    }

    const driverResult = await client.query(
      'SELECT id, status, license_expiry_date FROM drivers WHERE id = $1 FOR UPDATE',
      [driver_id]
    );
    const driver = driverResult.rows[0];
    if (!driver) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'The specified driver does not exist.' });
    }
    if (driver.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Driver is not available for dispatch (current status: '${driver.status}').`,
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(driver.license_expiry_date) <= today) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Driver license has expired and cannot be dispatched.',
      });
    }

    const insertResult = await client.query(
      `INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'dispatched')
       RETURNING id, vehicle_id, driver_id, source, destination, cargo_weight, planned_distance,
                 actual_distance, fuel_consumed, status, created_at, completed_at`,
      [vehicle_id, driver_id, source, destination, cargo_weight, planned_distance]
    );

    await client.query(`UPDATE vehicles SET status = 'on_trip' WHERE id = $1`, [vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'on_trip' WHERE id = $1`, [driver_id]);

    await client.query('COMMIT');

    return res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'This trip references a vehicle or driver that does not exist.',
      });
    }
    if (err.code === '23514') {
      return res.status(400).json({
        success: false,
        message: 'One or more values do not meet the required business rules.',
      });
    }
    console.error('[createTrip]', err);
    return res.status(500).json({ success: false, message: 'Failed to create trip.' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/trips/:id
 * Updates a trip's status. When moving to 'completed', stamps
 * completed_at = now(). Whenever a 'dispatched' trip moves to
 * 'completed' or 'cancelled', the assigned vehicle and driver are
 * released back to 'available' in the same transaction, keeping fleet
 * status consistent with trip state.
 */
export const updateTripStatus = async (req, res) => {
  const { id } = req.params;
  const { status, actual_distance, fuel_consumed } = req.body;

  if (!status || !VALID_TRIP_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `status must be one of: ${VALID_TRIP_STATUSES.join(', ')}.`,
    });
  }
  if (status === 'completed' && (actual_distance == null || Number(actual_distance) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'actual_distance is required and must be a positive number to complete a trip.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tripResult = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [id]);
    const trip = tripResult.rows[0];
    if (!trip) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Trip not found.' });
    }
    if (trip.status === status) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Trip is already in '${status}' status.` });
    }

    const updateResult =
      status === 'completed'
        ? await client.query(
            `UPDATE trips
             SET status = 'completed', actual_distance = $1, fuel_consumed = $2, completed_at = now()
             WHERE id = $3
             RETURNING *`,
            [actual_distance, fuel_consumed ?? null, id]
          )
        : await client.query(`UPDATE trips SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);

    if (trip.status === 'dispatched' && (status === 'completed' || status === 'cancelled')) {
      await client.query(`UPDATE vehicles SET status = 'available' WHERE id = $1`, [trip.vehicle_id]);
      await client.query(`UPDATE drivers SET status = 'available' WHERE id = $1`, [trip.driver_id]);
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, data: updateResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '22P02') {
      return res.status(400).json({ success: false, message: 'Invalid trip id or status value.' });
    }
    console.error('[updateTripStatus]', err);
    return res.status(500).json({ success: false, message: 'Failed to update trip status.' });
  } finally {
    client.release();
  }
};