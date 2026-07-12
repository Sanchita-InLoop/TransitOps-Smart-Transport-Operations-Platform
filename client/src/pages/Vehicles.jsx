'use strict';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const VEHICLE_TYPES = ['LCV', 'HCV', 'Trailer', 'Tanker', 'Refrigerated'];
const STATUS_FILTERS = ['all', 'available', 'on_trip', 'in_shop', 'retired'];

const STATUS_META = {
  available: { label: 'Available', dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  on_trip:   { label: 'On Trip',   dot: 'bg-sky-400',     text: 'text-sky-400',     bg: 'bg-sky-500/10',     ring: 'ring-sky-500/20' },
  in_shop:   { label: 'In Shop',   dot: 'bg-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   ring: 'ring-amber-500/20' },
  retired:   { label: 'Retired',   dot: 'bg-zinc-500',    text: 'text-zinc-400',    bg: 'bg-zinc-700/30',    ring: 'ring-zinc-700/40' },
};

function validateVehicleForm(values) {
  const errors = {};
  if (!values.registration_number || values.registration_number.trim().length < 3)
    errors.registration_number = 'Registration number is required (min 3 characters).';
  if (!values.model_name || values.model_name.trim().length < 2)
    errors.model_name = 'Model name is required.';
  if (!values.type)
    errors.type = 'Vehicle type is required.';
  const cap = Number(values.max_load_capacity);
  if (!values.max_load_capacity || isNaN(cap) || cap <= 0)
    errors.max_load_capacity = 'Max load capacity must be a positive number.';
  return errors;
}

function formatNumber(n) { return Number(n || 0).toLocaleString('en-IN'); }
function formatCurrency(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

// ── Icons ──
function IconClose(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
function IconPencil(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
}
function IconAlert(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>;
}

function Spinner() {
  return <div className="flex justify-center py-16"><div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" /></div>;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.retired;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

function inputClasses(error) {
  return [
    'w-full rounded-lg border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600',
    error ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/40'
          : 'border-zinc-700 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30',
  ].join(' ');
}

// ── Drawer ──
function VehicleFormDrawer({ open, onClose, onSubmit, initialValues, saving }) {
  const emptyForm = { registration_number: '', model_name: '', type: '', max_load_capacity: '', odometer: '', acquisition_cost: '' };
  const [values, setValues] = useState(initialValues ?? emptyForm);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (open) { setValues(initialValues ?? emptyForm); setErrors({}); setSubmitAttempted(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  if (!open) return null;
  const isEdit = Boolean(initialValues?.id);

  function handleChange(field, value) {
    setValues((p) => ({ ...p, [field]: value }));
    if (submitAttempted) setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitAttempted(true);
    const errs = validateVehicleForm(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({
      registration_number: values.registration_number.trim().toUpperCase(),
      model_name: values.model_name.trim(),
      type: values.type,
      max_load_capacity: Number(values.max_load_capacity),
      odometer: values.odometer === '' ? undefined : Number(values.odometer),
      acquisition_cost: values.acquisition_cost === '' ? undefined : Number(values.acquisition_cost),
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
            <p className="text-xs text-zinc-500">{isEdit ? "Update this vehicle's details." : 'Register a new vehicle in the fleet.'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><IconClose className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-6 py-5">
            {submitAttempted && errorCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorCount === 1 ? '1 error — fix it before saving.' : `${errorCount} errors — fix them before saving.`}</span>
              </div>
            )}
            <Field label="Registration Number" error={errors.registration_number} hint="e.g. DL 01 AB 4521">
              <input type="text" value={values.registration_number} onChange={(e) => handleChange('registration_number', e.target.value)} placeholder="DL 01 AB 4521" className={inputClasses(errors.registration_number)} />
            </Field>
            <Field label="Model Name" error={errors.model_name}>
              <input type="text" value={values.model_name} onChange={(e) => handleChange('model_name', e.target.value)} placeholder="e.g. Tata Prima 4928.S" className={inputClasses(errors.model_name)} />
            </Field>
            <Field label="Vehicle Type" error={errors.type}>
              <select value={values.type} onChange={(e) => handleChange('type', e.target.value)} className={inputClasses(errors.type)}>
                <option value="">Select type…</option>
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Max Load Capacity (kg)" error={errors.max_load_capacity}>
              <input type="number" min={1} value={values.max_load_capacity} onChange={(e) => handleChange('max_load_capacity', e.target.value)} placeholder="e.g. 8000" className={inputClasses(errors.max_load_capacity)} />
            </Field>
            <Field label="Odometer (km)" error={errors.odometer} hint="Optional">
              <input type="number" min={0} value={values.odometer} onChange={(e) => handleChange('odometer', e.target.value)} placeholder="e.g. 42300" className={inputClasses(errors.odometer)} />
            </Field>
            <Field label="Acquisition Cost (₹)" error={errors.acquisition_cost} hint="Optional">
              <input type="number" min={0} value={values.acquisition_cost} onChange={(e) => handleChange('acquisition_cost', e.target.value)} placeholder="e.g. 2850000" className={inputClasses(errors.acquisition_cost)} />
            </Field>
            {isEdit && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-500">
                Status is managed by the trip lifecycle and cannot be changed here.
              </div>
            )}
          </div>
          <div className="flex gap-3 border-t border-zinc-800 px-6 py-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-zinc-50 hover:bg-indigo-400 disabled:opacity-60">
              {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Vehicle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================
export default function Vehicles() {
  const [vehicles,       setVehicles]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [toast,          setToast]          = useState(null);

  const loadVehicles = useCallback(() => {
    setLoading(true);
    api.get('/vehicles')
      .then(setVehicles)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  const filteredVehicles = useMemo(() =>
    vehicles.filter((v) => {
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || v.registration_number.toLowerCase().includes(q) || v.model_name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    }), [vehicles, search, statusFilter]);

  const counts = useMemo(() => vehicles.reduce((acc, v) => { acc[v.status] = (acc[v.status] ?? 0) + 1; return acc; }, {}), [vehicles]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  }

  async function handleFormSubmit(values) {
    setSaving(true);
    try {
      if (editingVehicle) {
        const updated = await api.patch(`/vehicles/${editingVehicle.id}`, values);
        setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        showToast('Vehicle updated.');
      } else {
        const created = await api.post('/vehicles', values);
        setVehicles((prev) => [created, ...prev]);
        showToast('Vehicle added to fleet.');
      }
      setDrawerOpen(false);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Vehicles</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage the fleet — registration, capacity, and operational status.</p>
          </div>
          <button type="button" onClick={() => { setEditingVehicle(null); setDrawerOpen(true); }}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-zinc-50 hover:bg-indigo-400 transition">
            + Add Vehicle
          </button>
        </div>

        {/* Fleet summary */}
        <div className="mb-5 flex flex-wrap gap-3">
          {Object.entries(STATUS_META).map(([key, m]) => (
            <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${m.bg} ${m.ring} ring-1`}>
              <span className={`h-2 w-2 rounded-full ${m.dot}`} />
              <span className={`text-xs font-medium ${m.text}`}>{m.label}</span>
              <span className={`text-sm font-bold ${m.text}`}>{counts[key] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by registration, model, or type…"
            className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500/60" />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${statusFilter === s ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200'}`}>
                {s === 'all' ? 'All' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? <Spinner /> : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-8 text-center text-sm text-red-400">{error}</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3 font-medium">Registration</th>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Max Load</th>
                    <th className="px-4 py-3 font-medium">Odometer</th>
                    <th className="px-4 py-3 font-medium">Acq. Cost</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-zinc-100">{v.registration_number}</td>
                      <td className="px-4 py-3 text-zinc-200">{v.model_name}</td>
                      <td className="px-4 py-3"><span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{v.type}</span></td>
                      <td className="px-4 py-3 text-zinc-300">{formatNumber(v.max_load_capacity)} kg</td>
                      <td className="px-4 py-3 text-zinc-400">{formatNumber(v.odometer)} km</td>
                      <td className="px-4 py-3 text-zinc-400">{formatCurrency(v.acquisition_cost)}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => { setEditingVehicle(v); setDrawerOpen(true); }}
                          disabled={v.status === 'on_trip'}
                          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                          title={v.status === 'on_trip' ? 'Cannot edit while on a trip' : 'Edit vehicle'}>
                          <IconPencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">No vehicles match this search or filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-600">{filteredVehicles.length} of {vehicles.length} vehicles shown</p>
      </div>

      <VehicleFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSubmit={handleFormSubmit} initialValues={editingVehicle} saving={saving} />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-3 text-sm shadow-xl ${toast.startsWith('Error') ? 'border-red-500/30 bg-red-950 text-red-200' : 'border-zinc-800 bg-zinc-900 text-zinc-200'}`}>
          {toast}
        </div>
      )}
    </div>
  );
}