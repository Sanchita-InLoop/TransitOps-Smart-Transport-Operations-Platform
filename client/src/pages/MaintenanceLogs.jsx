'use strict';

import React, { useState, useMemo } from 'react';

// ============================================================================
// Mock data — swap for real fetch('/api/vehicles') + fetch('/api/maintenance-logs')
// calls when wiring up the backend. This local `vehicles` list simulates the
// status flip your backend already does transactionally: opening a log sets
// the vehicle to 'in_shop', closing it sets it back to 'available' — UNLESS
// the vehicle is 'retired', in which case status never changes.
// ============================================================================
const initialVehicles = [
  { id: 'v1', model_name: 'Tata Starbus', status: 'available' },
  { id: 'v2', model_name: 'Ashok Leyland Dost', status: 'in_shop' },
  { id: 'v3', model_name: 'Mahindra Bolero Pickup', status: 'available' },
  { id: 'v4', model_name: 'Force Traveller', status: 'retired' },
  { id: 'v5', model_name: 'Eicher Pro 2049', status: 'available' },
];

const initialLogs = [
  { id: 'm1', vehicle_id: 'v2', description: 'Brake pad replacement and inspection', opened_at: '2026-07-08', closed_at: null },
  { id: 'm2', vehicle_id: 'v1', description: 'Routine 10,000km service', opened_at: '2026-06-20', closed_at: '2026-06-22' },
  { id: 'm3', vehicle_id: 'v4', description: 'Final inspection before decommissioning', opened_at: '2026-05-01', closed_at: '2026-05-03' },
];

function validateLogForm(values) {
  const errors = {};

  if (!values.vehicle_id) {
    errors.vehicle_id = 'Select a vehicle for this log.';
  }

  if (!values.description || values.description.trim().length < 3) {
    errors.description = 'Description must be at least 3 characters long.';
  } else if (values.description.trim().length > 500) {
    errors.description = 'Description must be 500 characters or fewer.';
  }

  return errors;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// Small presentational pieces
// ============================================================================
function LogStatusBadge({ isOpen }) {
  return isOpen ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Open
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-400 ring-1 ring-zinc-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      Closed
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

// ============================================================================
// Drawer form — Open New Log
// ============================================================================
function LogFormDrawer({ open, onClose, onSubmit, vehicles }) {
  const emptyForm = { vehicle_id: '', description: '' };
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  React.useEffect(() => {
    if (open) {
      setValues(emptyForm);
      setErrors({});
      setSubmitAttempted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const selectedVehicle = vehicles.find((v) => v.id === values.vehicle_id);

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

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitAttempted(true);
    const validationErrors = validateLogForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({ ...values, description: values.description.trim() });
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Open Maintenance Log</h2>
            <p className="text-xs text-zinc-500">Sends the vehicle to the shop and starts a new log.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-6 py-5">
            {submitAttempted && errorCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  {errorCount === 1
                    ? 'There is 1 error in the form — please fix it before saving.'
                    : `There are ${errorCount} errors in the form — please fix them before saving.`}
                </span>
              </div>
            )}

            <Field label="Vehicle" error={errors.vehicle_id}>
              <select
                value={values.vehicle_id}
                onChange={(e) => handleChange('vehicle_id', e.target.value)}
                className={inputClasses(errors.vehicle_id)}
              >
                <option value="">Select vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.status === 'in_shop'}>
                    {v.model_name} {v.status === 'in_shop' ? '(already in shop)' : v.status === 'retired' ? '(retired)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Description" error={errors.description}>
              <textarea
                rows={4}
                value={values.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="e.g. Brake pad replacement and inspection"
                className={inputClasses(errors.description)}
              />
            </Field>

            {selectedVehicle?.status === 'retired' && (
              <div className="flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-400">
                <IconAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
                <span>This vehicle is retired — opening this log will not change its status.</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-zinc-800 px-6 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
              Open Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

function inputClasses(error) {
  return [
    'w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition',
    'placeholder:text-zinc-600',
    error
      ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/40'
      : 'border-zinc-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30',
  ].join(' ');
}

// ============================================================================
// Main page
// ============================================================================
export default function MaintenanceLogs() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [logs, setLogs] = useState(initialLogs);
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | closed
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const vehicleById = useMemo(() => {
    const map = new Map();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (statusFilter === 'open') return !log.closed_at;
        if (statusFilter === 'closed') return Boolean(log.closed_at);
        return true;
      })
      .sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
  }, [logs, statusFilter]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  // Mirrors the backend's transactional rule: opening a log flips the vehicle
  // to 'in_shop' unless it's 'retired', in which case status is left alone.
  function handleOpenLog({ vehicle_id, description }) {
    const newLog = {
      id: `m${Date.now()}`,
      vehicle_id,
      description,
      opened_at: todayISO(),
      closed_at: null,
    };
    setLogs((prev) => [newLog, ...prev]);

    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicle_id && v.status !== 'retired' ? { ...v, status: 'in_shop' } : v))
    );

    showToast('Maintenance log opened.');
    setDrawerOpen(false);
  }

  // Mirrors the backend's transactional rule: closing a log flips the vehicle
  // back to 'available' unless it's 'retired'.
  function handleCloseLog(log) {
    setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, closed_at: todayISO() } : l)));

    setVehicles((prev) =>
      prev.map((v) => (v.id === log.vehicle_id && v.status !== 'retired' ? { ...v, status: 'available' } : v))
    );

    showToast('Maintenance log closed.');
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Maintenance Logs</h1>
            <p className="mt-1 text-sm text-zinc-500">Open and close maintenance work orders per vehicle.</p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            + Open Log
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {['all', 'open', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === s ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Opened</th>
                  <th className="px-4 py-3 font-medium">Closed</th>
                  <th className="px-4 py-3 font-medium">Log Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const vehicle = vehicleById.get(log.vehicle_id);
                  const isOpen = !log.closed_at;
                  return (
                    <tr key={log.id} className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-zinc-100">
                        {vehicle?.model_name ?? 'Unknown vehicle'}
                        {vehicle?.status === 'retired' && (
                          <span className="ml-2 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 ring-1 ring-zinc-500/20">
                            RETIRED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{log.description}</td>
                      <td className="px-4 py-3 text-zinc-400">{formatDate(log.opened_at)}</td>
                      <td className="px-4 py-3 text-zinc-400">{formatDate(log.closed_at)}</td>
                      <td className="px-4 py-3"><LogStatusBadge isOpen={isOpen} /></td>
                      <td className="px-4 py-3 text-right">
                        {isOpen ? (
                          <button
                            type="button"
                            onClick={() => handleCloseLog(log)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                          >
                            Close Log
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No maintenance logs match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-600">{filteredLogs.length} of {logs.length} logs shown</p>
      </div>

      <LogFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleOpenLog}
        vehicles={vehicles}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}