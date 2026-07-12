'use strict';

import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/apiClient';

const TABS = [
  { key: 'draft', label: 'Draft' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_META = {
  draft: { label: 'Draft', text: 'text-zinc-400', bg: 'bg-zinc-500/10', ring: 'ring-zinc-500/20', dot: 'bg-zinc-400' },
  dispatched: { label: 'Dispatched', text: 'text-sky-400', bg: 'bg-sky-500/10', ring: 'ring-sky-500/20', dot: 'bg-sky-400' },
  completed: { label: 'Completed', text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelled', text: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20', dot: 'bg-red-400' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function validateCompleteForm(values, plannedDistance) {
  const errors = {};
  const distance = Number(values.actual_distance);

  if (values.actual_distance === '' || values.actual_distance === null) {
    errors.actual_distance = 'Actual distance is required to close out this trip.';
  } else if (Number.isNaN(distance) || distance <= 0) {
    errors.actual_distance = 'Actual distance must be a positive number.';
  } else if (plannedDistance && distance > plannedDistance * 3) {
    errors.actual_distance = `That's unusually far from the planned ${plannedDistance} km — double-check the value.`;
  }

  if (values.fuel_consumed !== '' && values.fuel_consumed !== null) {
    const fuel = Number(values.fuel_consumed);
    if (Number.isNaN(fuel) || fuel < 0) {
      errors.fuel_consumed = 'Fuel consumed must be a non-negative number.';
    }
  }

  return errors;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function IconClose(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconAlert(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
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

// NOTE: this posts { status: 'completed', actual_distance, fuel_consumed }
// to PATCH /trips/:id. Your updateTripStatus controller needs to accept and
// persist actual_distance/fuel_consumed when status === 'completed' — see
// the patched trip.controller.mjs shared alongside this file.
function CompleteTripModal({ trip, onClose, onConfirm }) {
  const [values, setValues] = useState({ actual_distance: '', fuel_consumed: '' });
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (!trip) return null;

  function handleChange(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
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
    setSubmitError(null);
    const validationErrors = validateCompleteForm(values, trip.planned_distance);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onConfirm(trip.id, {
        actual_distance: Number(values.actual_distance),
        fuel_consumed: values.fuel_consumed === '' ? null : Number(values.fuel_consumed),
      });
    } catch (err) {
      setSubmitError(err.message || 'Failed to complete trip.');
      setIsSubmitting(false);
    }
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">Complete Trip · {trip.source} → {trip.destination}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close">
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            {submitError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            {submitAttempted && errorCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Please fix the highlighted field{errorCount > 1 ? 's' : ''} below.</span>
              </div>
            )}

            <p className="text-xs text-zinc-500">Planned distance: <span className="text-zinc-300">{trip.planned_distance} km</span></p>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Actual Distance (km)</span>
              <input
                type="number"
                min={0}
                value={values.actual_distance}
                onChange={(e) => handleChange('actual_distance', e.target.value)}
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                  errors.actual_distance ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/40' : 'border-zinc-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30'
                }`}
                placeholder="e.g. 152"
              />
              {errors.actual_distance && <span className="mt-1.5 block text-xs text-red-400">{errors.actual_distance}</span>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Fuel Consumed (L) <span className="normal-case text-zinc-600">— optional</span></span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={values.fuel_consumed}
                onChange={(e) => handleChange('fuel_consumed', e.target.value)}
                className={`w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ${
                  errors.fuel_consumed ? 'border-red-500/60 focus:ring-1 focus:ring-red-500/40' : 'border-zinc-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30'
                }`}
                placeholder="e.g. 18.4"
              />
              {errors.fuel_consumed && <span className="mt-1.5 block text-xs text-red-400">{errors.fuel_consumed}</span>}
            </label>
          </div>

          <div className="flex gap-3 border-t border-zinc-800 px-5 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
              Back
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting && <IconSpinner className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving…' : 'Confirm Completion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CancelTripModal({ trip, onClose, onConfirm }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!trip) return null;

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(trip.id);
    } catch (err) {
      setError(err.message || 'Failed to cancel trip.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="px-5 py-5">
          <div className="mb-3 flex items-center gap-2 text-red-400">
            <IconAlert className="h-5 w-5" />
            <h2 className="text-sm font-semibold">Cancel this trip?</h2>
          </div>
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <p className="text-sm text-zinc-400">
            {trip.source} → {trip.destination} will be marked <span className="font-medium text-zinc-200">cancelled</span>.
            {trip.status === 'dispatched' && ' The assigned vehicle and driver will be released back to Available.'}
            {' '}This can&apos;t be undone.
          </p>
        </div>
        <div className="flex gap-3 border-t border-zinc-800 px-5 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
            Keep Trip
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <IconSpinner className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Cancelling…' : 'Cancel Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('dispatched');
  const [completingTrip, setCompletingTrip] = useState(null);
  const [cancellingTrip, setCancellingTrip] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.get('/trips');
      setTrips(res.data ?? []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  }

  const tabCounts = useMemo(() => {
    const counts = { draft: 0, dispatched: 0, completed: 0, cancelled: 0 };
    trips.forEach((t) => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [trips]);

  const visibleTrips = useMemo(
    () => trips.filter((t) => t.status === activeTab).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [trips, activeTab]
  );

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  async function handleConfirmComplete(tripId, { actual_distance, fuel_consumed }) {
    const res = await apiClient.patch(`/trips/${tripId}`, { status: 'completed', actual_distance, fuel_consumed });
    setTrips((prev) => prev.map((t) => (t.id === tripId ? res.data : t)));
    setCompletingTrip(null);
    showToast('Trip completed. Vehicle and driver are now Available.');
  }

  async function handleConfirmCancel(tripId) {
    const res = await apiClient.patch(`/trips/${tripId}`, { status: 'cancelled' });
    setTrips((prev) => prev.map((t) => (t.id === tripId ? res.data : t)));
    setCancellingTrip(null);
    showToast('Trip cancelled.');
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Trips</h1>
            <p className="mt-1 text-sm text-zinc-500">Track trips through their lifecycle and close them out.</p>
          </div>
          {!loading && (
            <button type="button" onClick={loadTrips} className="text-xs font-medium text-zinc-500 underline hover:text-zinc-300">
              Refresh
            </button>
          )}
        </div>

        {loadError && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <div className="flex items-start gap-2">
              <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
            <button type="button" onClick={loadTrips} className="whitespace-nowrap text-xs font-semibold underline hover:text-red-200">
              Retry
            </button>
          </div>
        )}

        <div className="mb-5 flex gap-1 border-b border-zinc-800">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const meta = STATUS_META[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                  isActive ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                  {tabCounts[tab.key]}
                </span>
                {isActive && <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center text-sm text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <IconSpinner className="h-4 w-4 animate-spin" /> Loading trips…
              </span>
            </div>
          )}

          {!loading && visibleTrips.map((trip) => (
            <div key={trip.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100">{trip.source} → {trip.destination}</h3>
                    <StatusBadge status={trip.status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Trip #{trip.id} · Created {formatDate(trip.created_at)}
                    {trip.completed_at && ` · Completed ${formatDate(trip.completed_at)}`}
                  </p>
                </div>

                <div className="flex gap-2">
                  {trip.status === 'dispatched' && (
                    <button
                      type="button"
                      onClick={() => setCompletingTrip(trip)}
                      className="rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
                    >
                      Complete Trip
                    </button>
                  )}
                  {(trip.status === 'draft' || trip.status === 'dispatched') && (
                    <button
                      type="button"
                      onClick={() => setCancellingTrip(trip)}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                    >
                      Cancel Trip
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-zinc-800 pt-4 text-xs sm:grid-cols-4">
                <InfoItem label="Driver" value={trip.driver_name ?? '—'} />
                <InfoItem label="Vehicle" value={trip.vehicle_registration ?? '—'} />
                <InfoItem label="Cargo Weight" value={`${Number(trip.cargo_weight).toLocaleString()} kg`} />
                <InfoItem label="Planned Distance" value={`${trip.planned_distance} km`} />
                {trip.status === 'completed' && (
                  <>
                    <InfoItem label="Actual Distance" value={`${trip.actual_distance} km`} />
                    <InfoItem label="Fuel Consumed" value={trip.fuel_consumed != null ? `${trip.fuel_consumed} L` : '—'} />
                  </>
                )}
              </div>
            </div>
          ))}

          {!loading && !loadError && visibleTrips.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
              <p className="text-sm text-zinc-500">No trips in <span className="text-zinc-300">{STATUS_META[activeTab].label}</span> right now.</p>
            </div>
          )}
        </div>
      </div>

      {completingTrip && (
        <CompleteTripModal trip={completingTrip} onClose={() => setCompletingTrip(null)} onConfirm={handleConfirmComplete} />
      )}

      {cancellingTrip && (
        <CancelTripModal trip={cancellingTrip} onClose={() => setCancellingTrip(null)} onConfirm={handleConfirmCancel} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-0.5 text-zinc-300">{value}</p>
    </div>
  );
}