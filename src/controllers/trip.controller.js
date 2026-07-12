'use strict';

const { query, getClient } = require('../config/db');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// GET /api/trips — broadly readable across roles.
const listTrips = catchAsync(async (req, res) => {
  const result = await query(
    `SELECT id, vehicle_id, driver_id, source, destination, cargo_weight,
            planned_distance, actual_distance, fuel_consumed, status,
            created_at, completed_at
     FROM trips
     ORDER BY created_at DESC`
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

/**
 * POST /api/trips
 * Restricted to 'fleet_manager' at the route level. Creates a trip in
 * 'draft' status — it does NOT touch vehicle/driver availability yet;
 * that only happens on dispatch (below), which is the actual commitment
 * point in the business process.
 */
const createTrip = catchAsync(async (req, res) => {
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance } = req.body;

  const result = await query(
    `INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft')
     RETURNING id, vehicle_id, driver_id, source, destination, cargo_weight,
               planned_distance, status, created_at`,
    [vehicle_id, driver_id, source, destination, cargo_weight, planned_distance]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * PATCH /api/trips/:id/dispatch
 * Restricted to 'fleet_manager'.
 *
 * ==================== TRANSACTION: CORE INTEGRITY POINT ====================
 * This is the single most important write path in the API from a data-
 * integrity standpoint: dispatching a trip must update THREE tables
 * (trips, vehicles, drivers) in lockstep. If any one update failed after
 * another succeeded, the fleet would end up in an inconsistent state
 * (e.g. a vehicle marked 'on_trip' with no actual active trip).
 *
 * Why a transaction, and why row locks:
 *  - BEGIN / COMMIT / ROLLBACK on a single checked-out client guarantees
 *    atomicity — either all three updates land, or none do.
 *  - `SELECT ... FOR UPDATE` locks the vehicle/driver rows for the
 *    duration of the transaction, preventing a race where two concurrent
 *    dispatch requests both read status = 'available' and then both
 *    commit, double-booking the same vehicle or driver.
 *  - Availability/state is re-validated AFTER acquiring the lock (not
 *    just trusted from the initial request), which is what actually
 *    closes the race condition.
 * =============================================================================
 */
const dispatchTrip = catchAsync(async (req, res) => {
  const tripId = req.params.id;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock and load the trip row.
    const tripResult = await client.query(
      'SELECT id, vehicle_id, driver_id, status FROM trips WHERE id = $1 FOR UPDATE',
      [tripId]
    );
    const trip = tripResult.rows[0];
    if (!trip) {
      throw ApiError.notFound('Trip not found.');
    }
    if (trip.status !== 'draft') {
      throw ApiError.conflict(`Only a 'draft' trip can be dispatched (current status: '${trip.status}').`);
    }

    // 2. Lock and validate the vehicle.
    const vehicleResult = await client.query(
      'SELECT id, status FROM vehicles WHERE id = $1 FOR UPDATE',
      [trip.vehicle_id]
    );
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) {
      throw ApiError.notFound('Assigned vehicle not found.');
    }
    if (vehicle.status !== 'available') {
      throw ApiError.conflict(`Vehicle is not available for dispatch (current status: '${vehicle.status}').`);
    }

    // 3. Lock and validate the driver.
    const driverResult = await client.query(
      'SELECT id, status FROM drivers WHERE id = $1 FOR UPDATE',
      [trip.driver_id]
    );
    const driver = driverResult.rows[0];
    if (!driver) {
      throw ApiError.notFound('Assigned driver not found.');
    }
    if (driver.status !== 'available') {
      throw ApiError.conflict(`Driver is not available for dispatch (current status: '${driver.status}').`);
    }

    // 4. All three updates happen inside the same transaction/client.
    const updatedTripResult = await client.query(
      `UPDATE trips SET status = 'dispatched' WHERE id = $1
       RETURNING id, vehicle_id, driver_id, status, created_at`,
      [tripId]
    );

    await client.query(`UPDATE vehicles SET status = 'on_trip' WHERE id = $1`, [trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'on_trip' WHERE id = $1`, [trip.driver_id]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: updatedTripResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err; // re-thrown into catchAsync -> errorHandler; no partial state persists.
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/trips/:id/complete
 * Restricted to 'fleet_manager' and 'driver' (a driver closing out their
 * own trip is a common real-world flow). Same transactional pattern as
 * dispatch: trip -> 'completed' and vehicle/driver -> 'available' must
 * move together.
 */
const completeTrip = catchAsync(async (req, res) => {
  const tripId = req.params.id;
  const { actual_distance, fuel_consumed } = req.body;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [tripId]);
    const trip = tripResult.rows[0];
    if (!trip) throw ApiError.notFound('Trip not found.');
    if (trip.status !== 'dispatched') {
      throw ApiError.conflict(`Only a 'dispatched' trip can be completed (current status: '${trip.status}').`);
    }

    const updatedTripResult = await client.query(
      `UPDATE trips
       SET status = 'completed', actual_distance = $1, fuel_consumed = $2, completed_at = now()
       WHERE id = $3
       RETURNING id, vehicle_id, driver_id, status, actual_distance, fuel_consumed, completed_at`,
      [actual_distance, fuel_consumed ?? null, tripId]
    );

    await client.query(`UPDATE vehicles SET status = 'available' WHERE id = $1`, [trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'available' WHERE id = $1`, [trip.driver_id]);

    await client.query('COMMIT');

    res.status(200).json({ success: true, data: updatedTripResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/trips/:id/cancel
 * Restricted to 'fleet_manager'. A 'draft' trip has no vehicle/driver
 * side effects to unwind; a 'dispatched' trip must release the vehicle
 * and driver back to 'available' — handled transactionally for the
 * same reasons as above.
 */
const cancelTrip = catchAsync(async (req, res) => {
  const tripId = req.params.id;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [tripId]);
    const trip = tripResult.rows[0];
    if (!trip) throw ApiError.notFound('Trip not found.');
    if (!['draft', 'dispatched'].includes(trip.status)) {
      throw ApiError.conflict(`A trip with status '${trip.status}' cannot be cancelled.`);
    }

    const updatedTripResult = await client.query(
      `UPDATE trips SET status = 'cancelled' WHERE id = $1
       RETURNING id, vehicle_id, driver_id, status, created_at`,
      [tripId]
    );

    if (trip.status === 'dispatched') {
      await client.query(`UPDATE vehicles SET status = 'available' WHERE id = $1`, [trip.vehicle_id]);
      await client.query(`UPDATE drivers SET status = 'available' WHERE id = $1`, [trip.driver_id]);
    }

    await client.query('COMMIT');

    res.status(200).json({ success: true, data: updatedTripResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { listTrips, createTrip, dispatchTrip, completeTrip, cancelTrip };
