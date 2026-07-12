'use strict';

const { query, getClient } = require('../config/db');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * THIS FILE REPLACES: trip.controller.mjs (getTrips/createTrip/updateTripStatus)
 *
 * That version was a generic stub: ESM, no validation, and a single
 * `updateTripStatus` PATCH /:id handler that (almost certainly) wrote
 * trips.status directly with no transaction and none of the required
 * business rules below. If that handler was used to "dispatch" a trip,
 * it could set status='dispatched' without ever flipping the vehicle
 * and driver to 'on_trip' — silently corrupting fleet state with no
 * error at all. This version restores the full, tested dispatch logic.
 */

const TRIP_COLUMNS = `id, vehicle_id, driver_id, source, destination, cargo_weight,
                      planned_distance, actual_distance, fuel_consumed, status,
                      created_at, completed_at`;

// GET /api/trips
const listTrips = catchAsync(async (req, res) => {
  const result = await query(`SELECT ${TRIP_COLUMNS} FROM trips ORDER BY created_at DESC`);
  res.status(200).json({ success: true, data: result.rows });
});

// POST /api/trips — always created in 'draft' status.
const createTrip = catchAsync(async (req, res) => {
  const { vehicle_id, driver_id, source, destination, cargo_weight, planned_distance } = req.body;

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

  res.status(201).json({ success: true, data: result.rows[0] });
});

/**
 * PATCH /api/trips/:id/dispatch
 * ============================================================================
 * ATOMIC TRANSACTION — the core deliverable for this vertical slice.
 * One checked-out client, BEGIN -> validate -> UPDATE x3 -> COMMIT, with
 * ROLLBACK on any failure and unconditional client.release(). SELECT ...
 * FOR UPDATE locks trip/vehicle/driver rows so two concurrent dispatch
 * requests can't both read 'available' and double-book the same asset.
 * ============================================================================
 */
const dispatchTrip = catchAsync(async (req, res) => {
  const { id: tripId } = req.params;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query(
      `SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`,
      [tripId]
    );
    const trip = tripResult.rows[0];
    if (!trip) throw ApiError.notFound('Trip not found.');
    if (trip.status !== 'draft') {
      throw ApiError.conflict(`Only a 'draft' trip can be dispatched (current status: '${trip.status}').`);
    }

    const vehicleResult = await client.query(
      'SELECT id, max_load_capacity, status FROM vehicles WHERE id = $1 FOR UPDATE',
      [trip.vehicle_id]
    );
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) throw ApiError.notFound('Assigned vehicle not found.');

    const driverResult = await client.query(
      'SELECT id, status, license_expiry_date FROM drivers WHERE id = $1 FOR UPDATE',
      [trip.driver_id]
    );
    const driver = driverResult.rows[0];
    if (!driver) throw ApiError.notFound('Assigned driver not found.');

    // (b) Cargo weight vs. vehicle max load capacity
    if (Number(trip.cargo_weight) > Number(vehicle.max_load_capacity)) {
      throw ApiError.badRequest(
        `Cargo weight (${trip.cargo_weight}) exceeds this vehicle's max load capacity (${vehicle.max_load_capacity}).`
      );
    }

    // (c) Double-booking guard
    if (vehicle.status === 'on_trip') {
      throw ApiError.conflict('This vehicle is already assigned to another active trip.');
    }
    if (driver.status === 'on_trip') {
      throw ApiError.conflict('This driver is already assigned to another active trip.');
    }

    // (d) License expiry + suspension
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(driver.license_expiry_date) <= today) {
      throw ApiError.conflict('Driver license has expired and cannot be dispatched.');
    }
    if (driver.status === 'suspended') {
      throw ApiError.conflict('Driver is suspended and cannot be dispatched.');
    }
    if (driver.status !== 'available') {
      throw ApiError.conflict(`Driver is not available for dispatch (current status: '${driver.status}').`);
    }

    // (e) Vehicle status
    if (vehicle.status === 'retired' || vehicle.status === 'in_shop') {
      throw ApiError.conflict(`Vehicle cannot be dispatched (current status: '${vehicle.status}').`);
    }
    if (vehicle.status !== 'available') {
      throw ApiError.conflict(`Vehicle is not available for dispatch (current status: '${vehicle.status}').`);
    }

    // (f) Commit the three-way state change
    const updatedTripResult = await client.query(
      `UPDATE trips SET status = 'dispatched' WHERE id = $1 RETURNING ${TRIP_COLUMNS}`,
      [tripId]
    );
    await client.query(`UPDATE vehicles SET status = 'on_trip' WHERE id = $1`, [trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'on_trip' WHERE id = $1`, [trip.driver_id]);

    await client.query('COMMIT');
    res.status(200).json({ success: true, data: updatedTripResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /api/trips/:id/complete — same atomic pattern, releases vehicle/driver.
const completeTrip = catchAsync(async (req, res) => {
  const { id: tripId } = req.params;
  const { actual_distance, fuel_consumed } = req.body;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query(`SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`, [tripId]);
    const trip = tripResult.rows[0];
    if (!trip) throw ApiError.notFound('Trip not found.');
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
    res.status(200).json({ success: true, data: updatedTripResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /api/trips/:id/cancel — releases vehicle/driver only if they were dispatched.
const cancelTrip = catchAsync(async (req, res) => {
  const { id: tripId } = req.params;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tripResult = await client.query(`SELECT ${TRIP_COLUMNS} FROM trips WHERE id = $1 FOR UPDATE`, [tripId]);
    const trip = tripResult.rows[0];
    if (!trip) throw ApiError.notFound('Trip not found.');
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
    res.status(200).json({ success: true, data: updatedTripResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = { listTrips, createTrip, dispatchTrip, completeTrip, cancelTrip };