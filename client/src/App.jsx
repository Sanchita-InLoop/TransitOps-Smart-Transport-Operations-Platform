'use strict';

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Vehicles   from './pages/Vehicles';
import Drivers    from './pages/Drivers';
import CreateTrip from './pages/Createtrip';
import TripList   from './pages/TripList';

// ============================================================================
// Sidebar navigation
// ============================================================================
const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',       icon: '≡ƒôè' },
  { to: '/vehicles',   label: 'Vehicles',         icon: '≡ƒÜ¢' },
  { to: '/drivers',    label: 'Driver Registry',  icon: '≡ƒôï' },
  { to: '/trips/new',  label: 'Dispatch Trip',    icon: '≡ƒÜÜ' },
  { to: '/trips',      label: 'Trip Monitor',     icon: '≡ƒöä' },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30">
          <span className="text-sm font-bold">T</span>
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-zinc-50">TransitOps</p>
          <p className="text-[11px] leading-tight text-zinc-500">Fleet &amp; Dispatch Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Fleet Management
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/trips'}
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

      {/* User + Logout */}
      <div className="border-t border-zinc-800 px-5 py-4">
        {user && (
          <div className="mb-3">
            <p className="text-xs font-medium text-zinc-300 truncate">{user.name ?? user.email}</p>
            <p className="text-[11px] text-zinc-600 capitalize">{user.role?.replace('_', ' ')}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ============================================================================
// Protected route ΓÇö redirects to /login if not authenticated
// ============================================================================
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// ============================================================================
// Shell layout (sidebar + main content area)
// ============================================================================
function AppShell() {
  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/vehicles"    element={<Vehicles />} />
          <Route path="/drivers"     element={<Drivers />} />
          <Route path="/trips/new"   element={<CreateTrip />} />
          <Route path="/trips"       element={<TripList />} />
          <Route path="*"            element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold text-zinc-100">Page not found.</h1>
      <NavLink to="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-zinc-50 hover:bg-indigo-400">
        ΓåÉ Back to Dashboard
      </NavLink>
    </div>
  );
}

// ============================================================================
// Root
// ============================================================================
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* All other routes require a valid session */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
