'use strict';

import React, { useState, useMemo } from 'react';

// ============================================================================
// Mock data — swap for a real fetch('/api/vehicles') call when wiring up
// the backend. Shape mirrors the Vehicle API (model_name, type, status,
// max_load_capacity, acquisition_cost).
// ============================================================================
const initialVehicles = [
  { id: 'v1', model_name: 'Tata Starbus', type: 'Bus', max_load_capacity: 5000, acquisition_cost: 3200000, status: 'available' },
  { id: 'v2', model_name: 'Ashok Leyland Dost', type: 'Van', max_load_capacity: 1500, acquisition_cost: 850000, status: 'in_shop' },
  { id: 'v3', model_name: 'Mahindra Bolero Pickup', type: 'Truck', max_load_capacity: 2200, acquisition_cost: 950000, status: 'available' },
  { id: 'v4', model_name: 'Force Traveller', type: 'Mini-Bus', max_load_capacity: 3200, acquisition_cost: 1800000, status: 'retired' },
  { id: 'v5', model_name: 'Eicher Pro 2049', type: 'Truck', max_load_capacity: 4900, acquisition_cost: 2100000, status: 'available' },
];

// TODO(Person A): replace with the real enum from your Zod vehicle schema.
const VEHICLE_TYPES = ['Bus', 'Mini-Bus', 'Van', 'Truck'];

const STATUS_META = {
  available: { label: 'Available', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  in_shop: { label: 'In Shop', dot: 'bg-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
  retired: { label: 'Retired', dot: 'bg-zinc-400', text: 'text-zinc-400', bg: 'bg-zinc-500/10', ring: 'ring-zinc-500/20' },
};

const STATUS_FILTERS = ['all', 'available', 'in_shop', 'retired'];
const TYPE_FILTERS = ['all', ...VEHICLE_TYPES];

// ============================================================================
// Helpers
// ============================================================================
function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function validateVehicleForm(values) {
  const errors = {};

  if (!values.model_name || values.model_name.trim().length < 2) {
    errors.model_name = 'Model name must be at least 2 characters long.';
  } else if (values.model_name.trim().length > 150) {
    errors.model_name = 'Model name must be 150 characters or fewer.';
  }

  if (!values.type) {
    errors.type = 'Vehicle type is required.';
  }

  const capacity = Number(values.max_load_capacity);
  if (values.max_load_capacity === '' || values.max_load_capacity === null) {
    errors.max_load_capacity = 'Max load capacity is required.';
  } else if (Number.isNaN(capacity) || capacity <= 0) {
    errors.max_load_capacity = 'Max load capacity must be a positive number.';
  }

  const cost = Number(values.acquisition_cost);
  if (values.acquisition_cost === '' || values.acquisition_cost === null) {
    errors.acquisition_cost = 'Acquisition cost is required.';
  } else if (Number.isNaN(cost) || cost < 0) {
    errors.acquisition_cost = 'Acquisition cost must be zero or a positive number.';
  }

  return errors;
}

// ============================================================================
// Small presentational pieces
// ============================================================================
function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.retired;
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
function VehicleFormDrawer({ open, onClose, onSubmit, initialValues }) {
  const emptyForm = {
    model_name: '',
    type: '',
    max_load_capacity: '',
    acquisition_cost: '',
    status: 'available',
  };

  const [values, setValues] = useState(initialValues ?? emptyForm);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
    const validationErrors = validateVehicleForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({
      ...values,
      model_name: values.model_name.trim(),
      max_load_capacity: Number(values.max_load_capacity),
      acquisition_cost: Number(values.acquisition_cost),
    });
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <p className="text-xs text-zinc-500">{isEdit ? 'Update this vehicle\'s details.' : 'Register a new vehicle to the fleet.'}</p>
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

            <Field label="Model Name" error={errors.model_name}>
              <input
                type="text"
                value={values.model_name}
                onChange={(e) => handleChange('model_name', e.target.value)}
                placeholder="e.g. Tata Starbus"
                className={inputClasses(errors.model_name)}
              />
            </Field>

            <Field label="Vehicle Type" error={errors.type}>
              <select
                value={values.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className={inputClasses(errors.type)}
              >
                <option value="">Select type…</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Max Load Capacity (kg)" error={errors.max_load_capacity}>
              <input
                type="number"
                min={0}
                value={values.max_load_capacity}
                onChange={(e) => handleChange('max_load_capacity', e.target.value)}
                placeholder="e.g. 5000"
                className={inputClasses(errors.max_load_capacity)}
              />
            </Field>

            <Field label="Acquisition Cost (₹)" error={errors.acquisition_cost}>
              <input
                type="number"
                min={0}
                value={values.acquisition_cost}
                onChange={(e) => handleChange('acquisition_cost', e.target.value)}
                placeholder="e.g. 3200000"
                className={inputClasses(errors.acquisition_cost)}
              />
            </Field>

            {isEdit && (
              <Field label="Status" error={errors.status}>
                <select
                  value={values.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={values.status === 'in_shop'}
                  className={inputClasses(errors.status)}
                >
                  <option value="available">Available</option>
                  <option value="retired">Retired</option>
                  {values.status === 'in_shop' && <option value="in_shop">In Shop</option>}
                </select>
                <p className="mt-1.5 text-xs text-zinc-500">
                  {values.status === 'in_shop'
                    ? "This vehicle is currently in an open maintenance log — close it on the Maintenance Logs page to change status."
                    : 'Set to Retired to permanently take this vehicle out of dispatch rotation.'}
                </p>
              </Field>
            )}
          </div>

          <div className="flex gap-3 border-t border-zinc-800 px-6 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
              {isEdit ? 'Save Changes' : 'Add Vehicle'}
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
export default function Vehicles() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [toast, setToast] = useState(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesType = typeFilter === 'all' || v.type === typeFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch = q.length === 0 || v.model_name.toLowerCase().includes(q);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [vehicles, search, statusFilter, typeFilter]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  function openAddDrawer() {
    setEditingVehicle(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(vehicle) {
    setEditingVehicle(vehicle);
    setDrawerOpen(true);
  }

  function handleFormSubmit(values) {
    if (editingVehicle) {
      setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? { ...v, ...values } : v)));
      showToast('Vehicle updated.');
    } else {
      const newVehicle = { ...values, id: `v${Date.now()}`, status: 'available' };
      setVehicles((prev) => [newVehicle, ...prev]);
      showToast('Vehicle added.');
    }
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Vehicles</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage fleet vehicles, capacity, and status.</p>
          </div>
          <button type="button" onClick={openAddDrawer} className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">
            + Add Vehicle
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by model name…"
            className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/60"
          />
          <div className="flex flex-wrap items-center gap-3">
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
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 outline-none focus:border-emerald-500/60"
            >
              {TYPE_FILTERS.map((t) => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-medium">Model Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Max Load Capacity</th>
                  <th className="px-4 py-3 font-medium">Acquisition Cost</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium text-zinc-100">{vehicle.model_name}</td>
                    <td className="px-4 py-3 text-zinc-300">{vehicle.type}</td>
                    <td className="px-4 py-3 text-zinc-400">{vehicle.max_load_capacity.toLocaleString('en-IN')} kg</td>
                    <td className="px-4 py-3 text-zinc-400">{formatCurrency(vehicle.acquisition_cost)}</td>
                    <td className="px-4 py-3"><StatusBadge status={vehicle.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(vehicle)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                      No vehicles match this search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-600">{filteredVehicles.length} of {vehicles.length} vehicles shown</p>
      </div>

      <VehicleFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={editingVehicle}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}