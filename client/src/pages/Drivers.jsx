'use strict';

import React, { useState, useMemo } from 'react';

// ============================================================================
// Mock data — swap for a real fetch('/api/drivers') call when wiring up
// the backend. Shape mirrors DRIVER_COLUMNS from driver.controller.js.
// ============================================================================
const initialDrivers = [
  { id: 'd1', name: 'Rajesh Kumar', license_number: 'DL-0420110149646', license_category: 'HMV', license_expiry_date: '2026-08-15', contact_number: '9876543210', safety_score: 92, status: 'available' },
  { id: 'd2', name: 'Amit Verma', license_number: 'MH-1220198765432', license_category: 'LMV', license_expiry_date: '2026-07-20', contact_number: '9812345678', safety_score: 78, status: 'on_trip' },
  { id: 'd3', name: 'Sunil Yadav', license_number: 'UP-3220220011223', license_category: 'HMV', license_expiry_date: '2025-12-01', contact_number: '9900112233', safety_score: 65, status: 'suspended' },
  { id: 'd4', name: 'Priya Sharma', license_number: 'KA-0520190033445', license_category: 'LMV', license_expiry_date: '2027-01-10', contact_number: '9765432109', safety_score: 88, status: 'off_duty' },
  { id: 'd5', name: 'Manoj Singh', license_number: 'RJ-1420210099887', license_category: 'HMV', license_expiry_date: '2026-07-25', contact_number: '9654321098', safety_score: 95, status: 'available' },
  { id: 'd6', name: 'Farhan Ali', license_number: 'TN-0920230055667', license_category: 'MC', license_expiry_date: '2026-01-02', contact_number: '9543210987', safety_score: 71, status: 'available' },
];

const LICENSE_CATEGORIES = ['LMV', 'HMV', 'MC', 'PSV'];

const STATUS_META = {
  available: { label: 'Available', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  on_trip: { label: 'On Trip', dot: 'bg-sky-400', text: 'text-sky-400', bg: 'bg-sky-500/10', ring: 'ring-sky-500/20' },
  off_duty: { label: 'Off Duty', dot: 'bg-zinc-400', text: 'text-zinc-400', bg: 'bg-zinc-500/10', ring: 'ring-zinc-500/20' },
  suspended: { label: 'Suspended', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
};

const STATUS_FILTERS = ['all', 'available', 'on_trip', 'off_duty', 'suspended'];

// ============================================================================
// Helpers
// ============================================================================
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

  const score = Number(values.safety_score);
  if (values.safety_score === '' || values.safety_score === null || values.safety_score === undefined) {
    errors.safety_score = 'Safety score is required.';
  } else if (!Number.isInteger(score)) {
    errors.safety_score = 'Safety score must be a whole number.';
  } else if (score < 0 || score > 100) {
    errors.safety_score = 'Safety score must be between 0 and 100.';
  }

  return errors;
}

// ============================================================================
// Small presentational pieces
// ============================================================================
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

function IconPencil(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
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
// Drawer form — used for both Add and Edit
// ============================================================================
function DriverFormDrawer({ open, onClose, onSubmit, initialValues }) {
  const emptyForm = {
    name: '',
    license_number: '',
    license_category: '',
    license_expiry_date: '',
    contact_number: '',
    safety_score: 100,
  };

  const [values, setValues] = useState(initialValues ?? emptyForm);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Reset form whenever the drawer opens against a (possibly new) target record.
  React.useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyForm);
      setErrors({});
      setSubmitAttempted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  if (!open) return null;

  const isEdit = Boolean(initialValues);

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
    const validationErrors = validateDriverForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({
      ...values,
      name: values.name.trim(),
      license_number: values.license_number.trim(),
      contact_number: values.contact_number.trim(),
      safety_score: Number(values.safety_score),
    });
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">{isEdit ? 'Edit Driver' : 'Add Driver'}</h2>
            <p className="text-xs text-zinc-500">{isEdit ? 'Update this driver\'s profile details.' : 'Onboard a new driver to the fleet.'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
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

            <Field label="Full Name" error={errors.name}>
              <input
                type="text"
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className={inputClasses(errors.name)}
              />
            </Field>

            <Field label="License Number" error={errors.license_number}>
              <input
                type="text"
                value={values.license_number}
                onChange={(e) => handleChange('license_number', e.target.value)}
                placeholder="e.g. DL-0420110149646"
                className={inputClasses(errors.license_number)}
              />
            </Field>

            <Field label="License Category" error={errors.license_category}>
              <select
                value={values.license_category}
                onChange={(e) => handleChange('license_category', e.target.value)}
                className={inputClasses(errors.license_category)}
              >
                <option value="">Select category…</option>
                {LICENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </Field>

            <Field label="License Expiry Date" error={errors.license_expiry_date}>
              <input
                type="date"
                value={values.license_expiry_date}
                onChange={(e) => handleChange('license_expiry_date', e.target.value)}
                className={inputClasses(errors.license_expiry_date)}
              />
            </Field>

            <Field label="Contact Number" error={errors.contact_number}>
              <input
                type="text"
                value={values.contact_number}
                onChange={(e) => handleChange('contact_number', e.target.value)}
                placeholder="e.g. 9876543210"
                className={inputClasses(errors.contact_number)}
              />
            </Field>

            <Field label="Safety Score (0–100)" error={errors.safety_score}>
              <input
                type="number"
                min={0}
                max={100}
                value={values.safety_score}
                onChange={(e) => handleChange('safety_score', e.target.value)}
                className={inputClasses(errors.safety_score)}
              />
            </Field>

            {isEdit && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-500">
                Status is managed automatically by the trip lifecycle (dispatch / complete / cancel) and can&apos;t be edited here.
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              {isEdit ? 'Save Changes' : 'Add Driver'}
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
export default function Drivers() {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [toast, setToast] = useState(null);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        d.name.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [drivers, search, statusFilter]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  function openAddDrawer() {
    setEditingDriver(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(driver) {
    setEditingDriver(driver);
    setDrawerOpen(true);
  }

  function handleFormSubmit(values) {
    // Duplicate license number guard — mirrors the pre-check pattern in
    // driver.controller.js (createDriver / updateDriver).
    const duplicate = drivers.some(
      (d) => d.license_number.toLowerCase() === values.license_number.toLowerCase() && d.id !== editingDriver?.id
    );
    if (duplicate) {
      window.alert('A driver with this license number already exists.');
      return;
    }

    if (editingDriver) {
      setDrivers((prev) =>
        prev.map((d) => (d.id === editingDriver.id ? { ...d, ...values } : d))
      );
      showToast('Driver updated.');
    } else {
      const newDriver = { ...values, id: `d${Date.now()}`, status: 'available' };
      setDrivers((prev) => [newDriver, ...prev]);
      showToast('Driver added.');
    }
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Drivers</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage driver profiles, licenses, and availability.</p>
          </div>
          <button
            type="button"
            onClick={openAddDrawer}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            + Add Driver
          </button>
        </div>

        {/* Filters */}
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
                  statusFilter === s
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
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
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium text-zinc-100">{driver.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{driver.license_number}</td>
                    <td className="px-4 py-3 text-zinc-300">{driver.license_category}</td>
                    <td className="px-4 py-3"><ExpiryCell dateStr={driver.license_expiry_date} /></td>
                    <td className="px-4 py-3 text-zinc-400">{driver.contact_number}</td>
                    <td className="px-4 py-3">
                      <span className={driver.safety_score < 70 ? 'text-amber-400' : 'text-zinc-300'}>
                        {driver.safety_score}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={driver.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(driver)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredDrivers.length === 0 && (
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

      <DriverFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={editingDriver}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}