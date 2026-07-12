'use strict';

import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient';

const emptyForm = {
  source: '',
  destination: '',
  cargo_weight: '',
  planned_distance: '',
  vehicle_id: '',
  driver_id: '',
};

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
  if (values.source && values.destination && values.source.trim().toLowerCase() === values.destination.trim().toLowerCase()) {
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

  if (!values.vehicle_id) errors.vehicle_id = 'Select an available vehicle.';
  if (!values.driver_id) errors.driver_id = 'Select an available driver.';

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

export default function CreateTrip() {
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    setLoadingOptions(true);
    setLoadError(null);
    try {
      // Vehicles support server-side status filtering; drivers don't yet,
      // so we filter client-side after fetching the full list.
      const [vehiclesRes, driversRes] = await Promise.all([
        apiClient.get('/vehicles?status=available'),
        apiClient.get('/drivers'),
      ]);
      setAvailableVehicles(vehiclesRes.data ?? []);
      setAvailableDrivers((driversRes.data ?? []).filter((d) => d.status === 'available'));
    } catch (err) {
      setLoadError(err.message || 'Failed to load available vehicles and drivers.');
    } finally {
      setLoadingOptions(false);
    }
  }

  const selectedVehicle = useMemo(
    () => availableVehicles.find((v) => String(v.id) === String(values.vehicle_id)) ?? null,
    [availableVehicles, values.vehicle_id]
  );

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
    if (submitAttempted) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitAttempted(true);
    setSuccessMessage(null);
    setSubmitError(null);

    const validationErrors = validateForm(values, selectedVehicle);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/trips', {
        vehicle_id: values.vehicle_id,
        driver_id: values.driver_id,
        source: values.source.trim(),
        destination: values.destination.trim(),
        cargo_weight: Number(values.cargo_weight),
        planned_distance: Number(values.planned_distance),
      });

      setSuccessMessage(
        `Trip dispatched: ${values.source} → ${values.destination}. The assigned vehicle and driver are now On Trip.`
      );
      setValues(emptyForm);
      setSubmitAttempted(false);
      setErrors({});

      // The vehicle/driver we just used are no longer available — refresh
      // the dropdowns so a stale, now-unavailable option can't be picked again.
      loadOptions();

      void res;
    } catch (err) {
      setSubmitError(err.message || 'Failed to create trip.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-50">Dispatch New Trip</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Creating a trip dispatches it immediately — only assets currently marked Available are eligible.
          </p>
        </div>

        {successMessage && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {loadError && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <div className="flex items-start gap-2">
              <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
            <button type="button" onClick={loadOptions} className="whitespace-nowrap text-xs font-semibold underline hover:text-red-100">
              Retry
            </button>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <form onSubmit={handleSubmit} noValidate>
            {submitError && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

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
                <input type="text" value={values.source} onChange={(e) => handleChange('source', e.target.value)} placeholder="e.g. Delhi" className={inputClasses(errors.source)} />
              </Field>

              <Field label="Destination" error={errors.destination}>
                <input type="text" value={values.destination} onChange={(e) => handleChange('destination', e.target.value)} placeholder="e.g. Jaipur" className={inputClasses(errors.destination)} />
              </Field>

              <Field
                label="Cargo Weight (kg)"
                error={errors.cargo_weight}
                hint={selectedVehicle ? `Max for selected vehicle: ${Number(selectedVehicle.max_load_capacity).toLocaleString()} kg` : undefined}
              >
                <input type="number" min={0} value={values.cargo_weight} onChange={(e) => handleChange('cargo_weight', e.target.value)} placeholder="e.g. 4200" className={inputClasses(errors.cargo_weight)} />
              </Field>

              <Field label="Planned Distance (km)" error={errors.planned_distance}>
                <input type="number" min={0} value={values.planned_distance} onChange={(e) => handleChange('planned_distance', e.target.value)} placeholder="e.g. 281" className={inputClasses(errors.planned_distance)} />
              </Field>

              <Field
                label="Vehicle"
                error={errors.vehicle_id}
                hint={!loadingOptions && availableVehicles.length === 0 ? 'No vehicles are currently available.' : undefined}
              >
                <select value={values.vehicle_id} onChange={(e) => handleChange('vehicle_id', e.target.value)} className={inputClasses(errors.vehicle_id)} disabled={loadingOptions}>
                  <option value="">{loadingOptions ? 'Loading vehicles…' : 'Select an available vehicle…'}</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} ({v.model_name}) — {Number(v.max_load_capacity).toLocaleString()} kg max
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Driver"
                error={errors.driver_id}
                hint={!loadingOptions && availableDrivers.length === 0 ? 'No drivers are currently available.' : undefined}
              >
                <select value={values.driver_id} onChange={(e) => handleChange('driver_id', e.target.value)} className={inputClasses(errors.driver_id)} disabled={loadingOptions}>
                  <option value="">{loadingOptions ? 'Loading drivers…' : 'Select an available driver…'}</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.license_number}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-5">
              <p className="text-xs text-zinc-600">Dispatch happens immediately on submit — there's no separate draft step.</p>
              <button
                type="submit"
                disabled={isSubmitting || loadingOptions}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-zinc-50 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <IconSpinner className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Dispatching…' : 'Dispatch Trip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}