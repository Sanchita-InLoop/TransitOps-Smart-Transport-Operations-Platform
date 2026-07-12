'use strict';

import React, { useEffect, useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../api/client';

// ============================================================================
// Helpers
// ============================================================================
const STATUS_META = {
  draft:      { label: 'Draft',      dot: 'bg-zinc-400',    text: 'text-zinc-400',    bg: 'bg-zinc-500/10',    ring: 'ring-zinc-500/20' },
  dispatched: { label: 'Dispatched', dot: 'bg-sky-400',     text: 'text-sky-400',     bg: 'bg-sky-500/10',     ring: 'ring-sky-500/20' },
  completed:  { label: 'Completed',  dot: 'bg-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  cancelled:  { label: 'Cancelled',  dot: 'bg-red-400',     text: 'text-red-400',     bg: 'bg-red-500/10',     ring: 'ring-red-500/20' },
};

const TRIP_PIE_COLORS = { draft: '#71717a', dispatched: '#38bdf8', completed: '#34d399', cancelled: '#f87171' };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function byStatus(rows, key) {
  const map = {};
  (rows ?? []).forEach((r) => { map[r[key] ?? r.status] = r.count ?? 0; });
  return map;
}

// ============================================================================
// Sub-components
// ============================================================================
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${m.bg} ${m.text} ${m.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function KpiCard({ label, value, sub, accentValue, icon }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="absolute right-4 top-4 text-2xl">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accentValue}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-zinc-300">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-medium text-zinc-100">{p.value}</span></p>
      ))}
    </div>
  );
};

// Spinner for loading states
function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-400" />
    </div>
  );
}

// ============================================================================
// Main Dashboard
// ============================================================================
export default function Dashboard() {
  const [kpis,        setKpis]        = useState(null);
  const [analytics,   setAnalytics]   = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [drivers,     setDrivers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/reports/analytics'),
      api.get('/trips'),
      api.get('/drivers'),
    ])
      .then(([kpisData, analyticsData, tripsData, driversData]) => {
        setKpis(kpisData);
        setAnalytics(analyticsData);
        // Most recent 5 trips
        setRecentTrips((tripsData ?? []).slice(0, 5));
        setDrivers(driversData ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived values from real data ──
  const vehicleMap  = useMemo(() => byStatus(kpis?.vehicles_by_status, 'status'), [kpis]);
  const driverMap   = useMemo(() => byStatus(kpis?.drivers_by_status,  'status'), [kpis]);

  const totalVehicles = useMemo(() =>
    Object.values(vehicleMap).reduce((s, n) => s + Number(n), 0), [vehicleMap]);

  const utilPct = totalVehicles > 0
    ? Math.round(((vehicleMap.on_trip ?? 0) / totalVehicles) * 100)
    : 0;

  const tripPieData = useMemo(() => {
    if (!analytics?.trips_by_status) return [];
    return analytics.trips_by_status.map((r) => ({
      name: STATUS_META[r.status]?.label ?? r.status,
      value: r.count,
      color: TRIP_PIE_COLORS[r.status] ?? '#71717a',
    }));
  }, [analytics]);

  // Drivers with licence expiring within 30 days
  const expiringDrivers = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return drivers
      .filter((d) => {
        const exp = new Date(d.license_expiry_date);
        const diff = Math.round((exp - today) / 86400000);
        return diff >= 0 && diff <= 30;
      })
      .map((d) => ({
        ...d,
        daysLeft: Math.round((new Date(d.license_expiry_date) - today) / 86400000),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [drivers]);

  if (loading) return <div className="min-h-screen bg-zinc-950"><Spinner /></div>;

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Error loading dashboard</p>
        <p className="mt-2 text-sm text-zinc-400">{error}</p>
        <p className="mt-1 text-xs text-zinc-600">Make sure the backend is running on port 4000.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Fleet overview · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <NavLink to="/trips/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-zinc-50 hover:bg-indigo-400 transition">
            🚚 Dispatch New Trip
          </NavLink>
        </div>

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Available Vehicles" value={vehicleMap.available ?? 0}
            sub={`${vehicleMap.on_trip ?? 0} on trip · ${vehicleMap.in_shop ?? 0} in shop`}
            icon="🚛" accentValue="text-emerald-400" />
          <KpiCard label="Active Trips" value={kpis?.active_trips ?? 0}
            sub={`${utilPct}% fleet utilisation`}
            icon="🔄" accentValue="text-sky-400" />
          <KpiCard label="Drivers Available" value={driverMap.available ?? 0}
            sub={`${driverMap.on_trip ?? 0} on trip · ${driverMap.off_duty ?? 0} off duty`}
            icon="📋" accentValue="text-violet-400" />
          <KpiCard label="Open Maintenance" value={kpis?.open_maintenance_tickets ?? 0}
            sub="Tickets awaiting closure"
            icon="🔧" accentValue={kpis?.open_maintenance_tickets > 0 ? 'text-amber-400' : 'text-zinc-300'} />
        </div>

        {/* ── Secondary stats ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Fuel Logged</p>
            <p className="mt-2 text-2xl font-bold text-zinc-100">{(analytics?.fuel?.total_liters ?? 0).toFixed(1)} L</p>
            <p className="mt-1 text-xs text-zinc-500">Cost: ₹{Number(analytics?.fuel?.total_cost ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total Expenses</p>
            <p className="mt-2 text-2xl font-bold text-zinc-100">₹{Number(analytics?.expenses?.total_amount ?? 0).toLocaleString('en-IN')}</p>
            <p className="mt-1 text-xs text-zinc-500">All recorded expense types</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fleet Utilisation</p>
            <p className="mt-2 text-2xl font-bold text-zinc-100">{utilPct}%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
              <div className="h-2 rounded-full bg-sky-500 transition-all" style={{ width: `${utilPct}%` }} />
            </div>
          </div>
        </div>

        {/* ── Trip Status Pie ── */}
        {tripPieData.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="mb-2 text-sm font-semibold text-zinc-200">Trip Status Breakdown</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tripPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {tripPieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(val) => <span style={{ color: '#a1a1aa', fontSize: 11 }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Recent Trips */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <p className="text-sm font-semibold text-zinc-200">Recent Trips</p>
              <NavLink to="/trips" className="text-xs text-indigo-400 hover:text-indigo-300 transition">View all →</NavLink>
            </div>
            {recentTrips.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">No trips recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-600">
                      <th className="px-5 py-3 font-medium">Route</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrips.map((t) => (
                      <tr key={t.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/20">
                        <td className="px-5 py-3 font-medium text-zinc-100">{t.source} → {t.destination}</td>
                        <td className="px-5 py-3 text-zinc-500">{formatDate(t.created_at)}</td>
                        <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expiring Licences */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <p className="text-sm font-semibold text-zinc-200">⚠️ Expiring Licences</p>
              <NavLink to="/drivers" className="text-xs text-indigo-400 hover:text-indigo-300 transition">Manage →</NavLink>
            </div>
            {expiringDrivers.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">No licences expiring within 30 days. ✓</p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {expiringDrivers.map((d) => (
                  <div key={d.id} className="px-5 py-4">
                    <p className="text-sm font-medium text-zinc-100">{d.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">{d.license_number}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                        d.daysLeft <= 7 ? 'bg-red-500/10 text-red-400 ring-red-500/20' : 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                      }`}>{d.daysLeft}d left</span>
                      <span className="text-xs text-zinc-500">Expires {formatDate(d.license_expiry_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}