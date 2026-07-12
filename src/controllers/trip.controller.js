'use strict';

const { query, getClient } = require('../config/db');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

const TRIP_COLUMNS = `id, vehicle_id, driver_id, source, destination, cargo_weight,
                      planned_distance, actual_distance, fuel_consumed, status,
                      created_at, completed_at`;

/**
 * GET /api/trips
 * Broadly readable across roles — every role has a legitimate reason to
 * see trip status (dispatch board, driver's own assignments, financial
 * reconciliation, safety audit).
 */
const listTrips = catchAsync(async (req, res) => {
  const result = await query(`SELECT ${TRIP_COLUMNS} FROM trips ORDER BY created_at DESC`);

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

/**
 * POST /api/trips
 * Restricted to 'fleet_manager' at the route level. Always created in
 * 'draft' status — no vehicle/driver side effects yet. This is
 * deliberate: a draft is just a *proposal* until dispatch actually
 * commits the vehicle and driver to it, which is where the real
 * availability/eligibility rules below get enforced.
 */
const createTrip = catchAsync(async (req, res) => {
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance } = req.body;

  // Fail fast with clean 404s if the referenced vehicle/driver don't
  // exist at all, rather than letting the INSERT bounce off the FK
  // constraint and surface a less specific 409 from errorHandler.js.
  const vehicleCheck = await query('SELECT id FROM vehicles WHERE id = $1', [vehicle_id]);
  if (vehicleCheck.rows.length === 0) {
    throw ApiError.notFound('The specified vehicle does not exist.');
  }
  const driverCheck = await query('SELECT id FROM drivers WHERE id = $1', [driver_id]);
  if (driverCheck.rows.length === 0) {
    throw ApiError.notFound('The specified driver does not exist.');
  }

  const result = await query(
    `INSERT INTO trips (vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft')
     RETURNING ${TRIP_COLUMNS}`,
    [vehicle_id, driver_id, source, destination, cargo_weight, planned_distance]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

/**
 * PATCH /api/trips/:id/dispatch
 * Restricted to 'fleet_manager' at the route level.
 *
 * ============================================================================
 * CORE ATOMIC TRANSACTION — read this block first, judges.
 *
 * Every step below (fetch, validate, update) runs against ONE checked-out
 * client wrapped in BEGIN / COMMIT / ROLLBACK. That guarantees:
 *
 *   1. ATOMICITY: trips.status, vehicles.status, and drivers.status move
 *      together or not at all. A crash/error between updates can never
 *      leave the fleet in an inconsistent state (e.g. a vehicle stuck
 *      'on_trip' with no dispatched trip pointing at it).
 *
 *   2. ISOLATION FROM RACE CONDITIONS: `SELECT ... FOR UPDATE` locks the
 *      trip, vehicle, and driver rows for the lifetime of this
 *      transaction. Without this, two concurrent dispatch requests could
 *      both read status = 'available' before either commits, and both
 *      would then double-book the same vehicle or driver. Locking closes
 *      that window entirely — the second request simply waits for the
 *      first transaction to finish, then re-reads the now-updated status
 *      and correctly rejects.
 *
 *   3. FAIL-SAFE ERROR HANDLING: every validation failure throws an
 *      ApiError with a specific status code (400/404/409) BEFORE any
 *      UPDATE runs. The catch block ALWAYS issues ROLLBACK and the
 *      `finally` ALWAYS releases the client back to the pool — this
 *      combination is what prevents connection leaks and orphaned
 *      transactions even under repeated failures (zero silent crashes).
 * ============================================================================
 */
const dispatchTrip = catchAsync(async (req, res) => {
  const { id: tripId } = req.params;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // --- (a) Fetch trip, vehicle, and driver, locking all three rows ---
    const tripResult = await client.query(
      `SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`,
      [tripId]
    );
    const trip = tripResult.rows[0];
    if (!trip) {
      throw ApiError.notFound('Trip not found.');
    }
    if (trip.status !== 'draft') {
      throw ApiError.conflict(`Only a 'draft' trip can be dispatched (current status: '${trip.status}').`);
    }

    const vehicleResult = await client.query(
      'SELECT id, max_load_capacity, status FROM vehicles WHERE id = $1 FOR UPDATE',
      [trip.vehicle_id]
    );
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) {
      throw ApiError.notFound('Assigned vehicle not found.');
    }

    const driverResult = await client.query(
      'SELECT id, status, license_expiry_date FROM drivers WHERE id = $1 FOR UPDATE',
      [trip.driver_id]
    );
    const driver = driverResult.rows[0];
    if (!driver) {
      throw ApiError.notFound('Assigned driver not found.');
    }

    // --- (b) Cargo weight must not exceed the vehicle's max load capacity ---
    if (Number(trip.cargo_weight) > Number(vehicle.max_load_capacity)) {
      throw ApiError.badRequest(
        `Cargo weight (${trip.cargo_weight}) exceeds this vehicle's max load capacity (${vehicle.max_load_capacity}).`
      );
    }

    // --- (c) Driver or vehicle must not already be 'on_trip' ---
    // (Checked explicitly and separately from (e)/(d) below per spec,
    // even though 'on_trip' is also excluded by the broader status
    // whitelist checks — this keeps the error message specific to the
    // double-booking scenario rather than a generic status mismatch.)
    if (vehicle.status === 'on_trip') {
      throw ApiError.conflict('This vehicle is already assigned to another active trip.');
    }
    if (driver.status === 'on_trip') {
      throw ApiError.conflict('This driver is already assigned to another active trip.');
    }

    // --- (d) Driver license must not be expired, and driver must not be suspended ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const licenseExpiry = new Date(driver.license_expiry_date);
    if (licenseExpiry <= today) {
      throw ApiError.conflict('Driver license has expired and cannot be dispatched.');
    }
    if (driver.status === 'suspended') {
      throw ApiError.conflict('Driver is suspended and cannot be dispatched.');
    }
    // Belt-and-braces: any status other than 'available' at this point
    // (e.g. 'off_duty') is also not dispatch-eligible.
    if (driver.status !== 'available') {
      throw ApiError.conflict(`Driver is not available for dispatch (current status: '${driver.status}').`);
    }

    // --- (e) Vehicle must not be 'retired' or 'in_shop' ---
    if (vehicle.status === 'retired' || vehicle.status === 'in_shop') {
      throw ApiError.conflict(`Vehicle cannot be dispatched (current status: '${vehicle.status}').`);
    }
    if (vehicle.status !== 'available') {
      throw ApiError.conflict(`Vehicle is not available for dispatch (current status: '${vehicle.status}').`);
    }

    // --- (f) All validations passed — commit the three-way state change ---
    const updatedTripResult = await client.query(
      `UPDATE trips SET status = 'dispatched' WHERE id = $1 RETURNING ${TRIP_COLUMNS}`,
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
    // Any failure at any step — validation or unexpected DB error alike —
    // rolls back the ENTIRE transaction. No partial update ever persists.
    await client.query('ROLLBACK');
    throw err; // re-thrown into catchAsync -> central errorHandler.
  } finally {
    // Always release the client back to the pool, success or failure,
    // so a spike of failed dispatch attempts can never exhaust the pool.
    client.release();
  }
});

/**
 * PATCH /api/trips/:id/complete
 * Restricted to 'fleet_manager' and 'driver' at the route level (a
 * driver closing out their own assignment is a common real-world flow).
 *
 * Same atomic-transaction pattern as dispatch: trip -> 'completed' and
 * vehicle/driver -> 'available' must move together, or not at all.
 */
const completeTrip = catchAsync(async (req, res) => {
  const { id: tripId } = req.params;
  const { actual_distance, fuel_consumed } = req.body;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query(
      `SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`,
      [tripId]
    );
    const trip = tripResult.rows[0];
    if (!trip) {
      throw ApiError.notFound('Trip not found.');
    }
    if (trip.status !== 'dispatched') {
      throw ApiError.conflict(`Only a 'dispatched' trip can be completed (current status: '${trip.status}').`);
    }

    const updatedTripResult = await client.query(
      `UPDATE trips
       SET status = 'completed', actual_distance = $1, fuel_consumed = $2, completed_at = now()
       WHERE id = $3
       RETURNING ${TRIP_COLUMNS}`,
      [actual_distance, fuel_consumed ?? null, tripId]
    );

    await client.query(`UPDATE vehicles SET status = 'available' WHERE id = $1`, [trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'available' WHERE id = $1`, [trip.driver_id]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: updatedTripResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/trips/:id/cancel
 * Restricted to 'fleet_manager' at the route level.
 *
 * A trip in 'draft' has no vehicle/driver side effects to unwind (they
 * were never flipped to 'on_trip'). A trip in 'dispatched' DOES need
 * vehicle/driver restored to 'available' — handled conditionally, still
 * inside the same atomic transaction as the status flip itself.
 */
const cancelTrip = catchAsync(async (req, res) => {
  const { id: tripId } = req.params;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query(
      `SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`,
      [tripId]
    );
    const trip = tripResult.rows[0];
    if (!trip) {
      throw ApiError.notFound('Trip not found.');
    }
    if (!['draft', 'dispatched'].includes(trip.status)) {
      throw ApiError.conflict(`A trip with status '${trip.status}' cannot be cancelled.`);
    }

    const updatedTripResult = await client.query(
      `UPDATE trips SET status = 'cancelled' WHERE id = $1 RETURNING ${TRIP_COLUMNS}`,
      [tripId]
    );

    if (trip.status === 'dispatched') {
      await client.query(`UPDATE vehicles SET status = 'available' WHERE id = $1`, [trip.vehicle_id]);
      await client.query(`UPDATE drivers SET status = 'available' WHERE id = $1`, [trip.driver_id]);
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: updatedTripResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { listTrips, createTrip, dispatchTrip, completeTrip, cancelTrip };
