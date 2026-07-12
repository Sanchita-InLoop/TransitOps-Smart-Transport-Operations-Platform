'use strict';

import React, { useMemo, useState } from 'react';

// ============================================================================
// Mock data — swap for real fetch('/api/vehicles') / fetch('/api/drivers')
// calls when wiring up the backend. Only 'available' assets are eligible
// for dispatch, mirroring the dispatchTrip business rules in
// trip.controller.js (driver/vehicle must be 'available', not 'on_trip',
// 'suspended', 'in_shop', or 'retired').
// ============================================================================
const mockVehicles = [
  { id: 'v1', name: 'Tata Truck · DL 01 AB 4521', max_load_capacity: 5000, status: 'available' },
  { id: 'v2', name: 'Ashok Leyland · MH 12 CD 7788', max_load_capacity: 12000, status: 'available' },
  { id: 'v3', name: 'Mahindra Bolero Pickup · KA 05 EF 3391', max_load_capacity: 1500, status: 'on_trip' },
  { id: 'v4', name: 'Eicher Pro · RJ 14 GH 9021', max_load_capacity: 9000, status: 'in_shop' },
  { id: 'v5', name: 'Tata Ace · UP 32 IJ 5567', max_load_capacity: 750, status: 'available' },
];

const mockDrivers = [
  { id: 'd1', name: 'Rajesh Kumar', license_number: 'DL-0420110149646', status: 'available' },
  { id: 'd2', name: 'Amit Verma', license_number: 'MH-1220198765432', status: 'on_trip' },
  { id: 'd3', name: 'Priya Sharma', license_number: 'KA-0520190033445', status: 'available' },
  { id: 'd4', name: 'Sunil Yadav', license_number: 'UP-3220220011223', status: 'suspended' },
  { id: 'd5', name: 'Farhan Ali', license_number: 'TN-0920230055667', status: 'available' },
];

const emptyForm = {
  source: '',
  destination: '',
  cargo_weight: '',
  planned_distance: '',
  vehicle_id: '',
  driver_id: '',
};

// ============================================================================
// Helpers
// ============================================================================
function IconAlert(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconSpinner(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  );
}

function validateForm(values, selectedVehicle) {
  const errors = {};

  if (!values.source || values.source.trim().length < 2) {
    errors.source = 'Source is required (min 2 characters).';
  }
  if (!values.destination || values.destination.trim().length < 2) {
    errors.destination = 'Destination is required (min 2 characters).';
  }
  if (
    values.source &&
    values.destination &&
    values.source.trim().toLowerCase() === values.destination.trim().toLowerCase()
  ) {
    errors.destination = 'Destination must be different from source.';
  }

  const cargo = Number(values.cargo_weight);
  if (values.cargo_weight === '' || values.cargo_weight === null) {
    errors.cargo_weight = 'Cargo weight is required.';
  } else if (Number.isNaN(cargo) || cargo <= 0) {
    errors.cargo_weight = 'Cargo weight must be a positive number.';
  } else if (selectedVehicle && cargo > Number(selectedVehicle.max_load_capacity)) {
    errors.cargo_weight = `Cargo weight (${cargo} kg) exceeds this vehicle's max load capacity (${selectedVehicle.max_load_capacity} kg).`;
  }

  const distance = Number(values.planned_distance);
  if (values.planned_distance === '' || values.planned_distance === null) {
    errors.planned_distance = 'Planned distance is required.';
  } else if (Number.isNaN(distance) || distance <= 0) {
    errors.planned_distance = 'Planned distance must be a positive number.';
  }

  if (!values.vehicle_id) {
    errors.vehicle_id = 'Select an available vehicle.';
  }
  if (!values.driver_id) {
    errors.driver_id = 'Select an available driver.';
  }

  return errors;
}

function inputClasses(error) {
  return [
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition',
    'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500',
    'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40',
    error ? 'border-red-700 focus:border-red-500 focus:ring-red-500/40' : '',
  ].join(' ');
}

function Field({ label, error, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

// ============================================================================
// Main page
// ============================================================================
export default function CreateTrip() {
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const availableVehicles = useMemo(() => mockVehicles.filter((v) => v.status === 'available'), []);
  const availableDrivers = useMemo(() => mockDrivers.filter((d) => d.status === 'available'), []);

  const selectedVehicle = useMemo(
    () => availableVehicles.find((v) => v.id === values.vehicle_id) ?? null,
    [availableVehicles, values.vehicle_id]
  );

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    if (submitAttempted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        // Re-check cargo weight live if the vehicle selection changed underneath it.
        return next;
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitAttempted(true);
    setSuccessMessage(null);

    const validationErrors = validateForm(values, selectedVehicle);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    // Simulated async submission — replace with POST /api/trips.
    // New trips are always created in 'draft' status; dispatch (moving
    // vehicle/driver to 'on_trip') happens as a separate, atomic step.
    window.setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(
        `Trip created as a draft: ${values.source} → ${values.destination}. Dispatch it from Trip Monitor when ready.`
      );
      setValues(emptyForm);
      setSubmitAttempted(false);
      setErrors({});
    }, 700);
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-50">Dispatch New Trip</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create a new trip in draft. Only assets currently marked Available are eligible for assignment.
          </p>
        </div>

        {/* Success banner */}
        {successMessage && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <form onSubmit={handleSubmit} noValidate>
            {/* Error summary card */}
            {submitAttempted && errorCount > 0 && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {errorCount === 1 ? 'There is 1 error in this form.' : `There are ${errorCount} errors in this form.`}
                  </p>
                  <p className="mt-0.5 text-red-300/80">Fix the highlighted fields below before dispatching.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Source" error={errors.source}>
                <input
                  type="text"
                  value={values.source}
                  onChange={(e) => handleChange('source', e.target.value)}
                  placeholder="e.g. Delhi"
                  className={inputClasses(errors.source)}
                />
              </Field>

              <Field label="Destination" error={errors.destination}>
                <input
                  type="text"
                  value={values.destination}
                  onChange={(e) => handleChange('destination', e.target.value)}
                  placeholder="e.g. Jaipur"
                  className={inputClasses(errors.destination)}
                />
              </Field>

              <Field
                label="Cargo Weight (kg)"
                error={errors.cargo_weight}
                hint={selectedVehicle ? `Max for selected vehicle: ${selectedVehicle.max_load_capacity.toLocaleString()} kg` : undefined}
              >
                <input
                  type="number"
                  min={0}
                  value={values.cargo_weight}
                  onChange={(e) => handleChange('cargo_weight', e.target.value)}
                  placeholder="e.g. 4200"
                  className={inputClasses(errors.cargo_weight)}
                />
              </Field>

              <Field label="Planned Distance (km)" error={errors.planned_distance}>
                <input
                  type="number"
                  min={0}
                  value={values.planned_distance}
                  onChange={(e) => handleChange('planned_distance', e.target.value)}
                  placeholder="e.g. 281"
                  className={inputClasses(errors.planned_distance)}
                />
              </Field>

              <Field
                label="Vehicle"
                error={errors.vehicle_id}
                hint={availableVehicles.length === 0 ? 'No vehicles are currently available.' : undefined}
              >
                <select
                  value={values.vehicle_id}
                  onChange={(e) => handleChange('vehicle_id', e.target.value)}
                  className={inputClasses(errors.vehicle_id)}
                >
                  <option value="">Select an available vehicle…</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.max_load_capacity.toLocaleString()} kg max
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Driver"
                error={errors.driver_id}
                hint={availableDrivers.length === 0 ? 'No drivers are currently available.' : undefined}
              >
                <select
                  value={values.driver_id}
                  onChange={(e) => handleChange('driver_id', e.target.value)}
                  className={inputClasses(errors.driver_id)}
                >
                  <option value="">Select an available driver…</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.license_number}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-5">
              <p className="text-xs text-zinc-600">
                New trips start in <span className="text-zinc-400">Draft</span> — dispatch happens separately from Trip Monitor.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-zinc-50 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <IconSpinner className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Creating…' : 'Create Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}