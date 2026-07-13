'use strict';

import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../Apiclient';

const LICENSE_CATEGORIES = ['LMV', 'HMV', 'MC', 'PSV'];

const STATUS_META = {
  available: { label: 'Available', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  on_trip: { label: 'On Trip', dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-500/10', ring: 'ring-sky-500/20' },
  off_duty: { label: 'Off Duty', dot: 'bg-zinc-400', text: 'text-zinc-400', bg: 'bg-zinc-500/10', ring: 'ring-zinc-500/20' },
  suspended: { label: 'Suspended', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
};

const STATUS_FILTERS = ['all', 'available', 'on_trip', 'off_duty', 'suspended'];

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function validateDriverForm(values) {
  const errors = {};

  if (!values.name || values.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long.';
  } else if (values.name.trim().length > 150) {
    errors.name = 'Name must be 150 characters or fewer.';
  }

  if (!values.license_number || values.license_number.trim().length < 1) {
    errors.license_number = 'License number is required.';
  } else if (values.license_number.trim().length > 50) {
    errors.license_number = 'License number must be 50 characters or fewer.';
  }

  if (!values.license_category) {
    errors.license_category = 'License category is required.';
  }

  if (!values.license_expiry_date) {
    errors.license_expiry_date = 'License expiry date is required.';
  } else if (Number.isNaN(new Date(values.license_expiry_date).getTime())) {
    errors.license_expiry_date = 'Enter a valid date (YYYY-MM-DD).';
  }

  if (!values.contact_number || values.contact_number.trim().length < 7) {
    errors.contact_number = 'A valid contact number is required (min 7 digits).';
  } else if (!/^[0-9+\-\s()]{7,20}$/.test(values.contact_number.trim())) {
    errors.contact_number = 'Contact number contains invalid characters.';
  }

  return errors;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.off_duty;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ExpiryCell({ dateStr }) {
  const diff = daysUntil(dateStr);
  let classes = 'text-zinc-300';
  let suffix = null;

  if (diff < 0) {
    classes = 'text-red-400 font-medium';
    suffix = <span className="ml-2 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 ring-1 ring-red-500/20">EXPIRED</span>;
  } else if (diff <= 30) {
    classes = 'text-amber-400 font-medium';
    suffix = <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-amber-500/20">{diff}d LEFT</span>;
  }

  return (
    <span className={`inline-flex items-center whitespace-nowrap text-sm ${classes}`}>
      {formatDate(dateStr)}
      {suffix}
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

// NOTE: the deployed backend only exposes POST /drivers (create) and
// PATCH /drivers/:id/status (status change) — there's no endpoint yet to
// edit an existing driver's name/license/contact fields. So this drawer
// is add-only; changing a driver's operational status is handled by the
// separate StatusModal below.
function AddDriverDrawer({ open, onClose, onSubmit }) {
  const emptyForm = { name: '', license_number: '', license_category: '', license_expiry_date: '', contact_number: '' };

  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (open) {
      setValues(emptyForm);
      setErrors({});
      setSubmitAttempted(false);
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

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
    const validationErrors = validateDriverForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        license_number: values.license_number.trim(),
        contact_number: values.contact_number.trim(),
      });
    } catch (err) {
      setSubmitError(err.message || 'Failed to add driver.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Add Driver</h2>
            <p className="text-xs text-zinc-500">Onboard a new driver to the fleet.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-6 py-5">
            {submitError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

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

            <Field label="Full Name" error={errors.name}>
              <input type="text" value={values.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Rajesh Kumar" className={inputClasses(errors.name)} />
            </Field>

            <Field label="License Number" error={errors.license_number}>
              <input type="text" value={values.license_number} onChange={(e) => handleChange('license_number', e.target.value)} placeholder="e.g. DL-0420110149646" className={inputClasses(errors.license_number)} />
            </Field>

            <Field label="License Category" error={errors.license_category}>
              <select value={values.license_category} onChange={(e) => handleChange('license_category', e.target.value)} className={inputClasses(errors.license_category)}>
                <option value="">Select category…</option>
                {LICENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </Field>

            <Field label="License Expiry Date" error={errors.license_expiry_date}>
              <input type="date" value={values.license_expiry_date} onChange={(e) => handleChange('license_expiry_date', e.target.value)} className={inputClasses(errors.license_expiry_date)} />
            </Field>

            <Field label="Contact Number" error={errors.contact_number}>
              <input type="text" value={values.contact_number} onChange={(e) => handleChange('contact_number', e.target.value)} placeholder="e.g. 9876543210" className={inputClasses(errors.contact_number)} />
            </Field>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-500">
              Safety score starts at 100 and status starts as Available — both are managed automatically after onboarding.
            </div>
          </div>

          <div className="flex gap-3 border-t border-zinc-800 px-6 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting && <IconSpinner className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Adding…' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusModal({ driver, onClose, onSubmit }) {
  const [status, setStatus] = useState(driver?.status ?? 'available');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (driver) setStatus(driver.status);
  }, [driver]);

  if (!driver) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(driver.id, status);
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-100">Update Status · {driver.name}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close">
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClasses(false)}>
                {Object.keys(STATUS_META).map((key) => (
                  <option key={key} value={key}>{STATUS_META[key].label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-3 border-t border-zinc-800 px-5 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting && <IconSpinner className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving…' : 'Save Status'}
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

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusModalDriver, setStatusModalDriver] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.get('/drivers');
      setDrivers(res.data ?? []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  }

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = q.length === 0 || d.name.toLowerCase().includes(q) || d.license_number.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [drivers, search, statusFilter]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  async function handleCreateDriver(values) {
    const res = await apiClient.post('/drivers', values);
    setDrivers((prev) => [res.data, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    setDrawerOpen(false);
    showToast('Driver added.');
  }

  async function handleStatusChange(driverId, status) {
    const res = await apiClient.patch(`/drivers/${driverId}/status`, { status });
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? res.data : d)));
    setStatusModalDriver(null);
    showToast('Driver status updated.');
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Drivers</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage driver profiles, licenses, and availability.</p>
          </div>
          <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
            + Add Driver
          </button>
        </div>

        {loadError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <div className="flex items-start gap-2">
              <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{loadError}</span>
            </div>
            <button type="button" onClick={loadDrivers} className="whitespace-nowrap text-xs font-semibold underline hover:text-red-200">
              Retry
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or license number…"
            className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/60"
          />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === s ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">License Number</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Safety Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                      <span className="inline-flex items-center gap-2">
                        <IconSpinner className="h-4 w-4 animate-spin" /> Loading drivers…
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium text-zinc-100">{driver.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{driver.license_number}</td>
                    <td className="px-4 py-3 text-zinc-300">{driver.license_category}</td>
                    <td className="px-4 py-3"><ExpiryCell dateStr={driver.license_expiry_date} /></td>
                    <td className="px-4 py-3 text-zinc-400">{driver.contact_number}</td>
                    <td className="px-4 py-3">
                      <span className={driver.safety_score < 70 ? 'text-amber-400' : 'text-zinc-300'}>{driver.safety_score}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={driver.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setStatusModalDriver(driver)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && !loadError && filteredDrivers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No drivers match this search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-600">{filteredDrivers.length} of {drivers.length} drivers shown</p>
      </div>

      <AddDriverDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSubmit={handleCreateDriver} />
      <StatusModal driver={statusModalDriver} onClose={() => setStatusModalDriver(null)} onSubmit={handleStatusChange} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}