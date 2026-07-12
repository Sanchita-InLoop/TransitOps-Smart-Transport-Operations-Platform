'use strict';

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';

import Drivers from './pages/Drivers';
import TripList from './pages/TripList';
import CreateTrip from './pages/CreateTrip';
import FuelExpenses from './pages/FuelExpenses';
import Reports from './pages/Reports';

const NAV_ITEMS = [
  { to: '/drivers', label: 'Driver Registry', icon: '📋' },
  { to: '/trips/new', label: 'Dispatch New Trip', icon: '🚚' },
  { to: '/trips', label: 'Trip Monitor', icon: '🔄' },
  { to: '/fuel-expenses', label: 'Fuel & Expenses', icon: '⛽' },
  { to: '/reports', label: 'Reports', icon: '📊' },
];

function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30">
          <span className="text-sm font-bold">T</span>
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-zinc-50">TransitOps</p>
          <p className="text-[11px] leading-tight text-zinc-500">Fleet &amp; Dispatch Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-zinc-800 text-zinc-50 ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
              ].join(' ')
            }
          >
            <span aria-hidden="true" className="text-base leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-zinc-800 px-5 py-4">
        <p className="text-[11px] text-zinc-600">TransitOps · Fleet Console</p>
      </div>
    </aside>
  );
}

function NotFound() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold text-zinc-100">This route doesn&apos;t exist.</h1>
      <NavLink to="/drivers" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-zinc-50 hover:bg-indigo-400">
        ← Back to Driver Registry
      </NavLink>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/drivers" replace />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/trips/new" element={<CreateTrip />} />
            <Route path="/trips" element={<TripList />} />
            <Route path="/fuel-expenses" element={<FuelExpenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}