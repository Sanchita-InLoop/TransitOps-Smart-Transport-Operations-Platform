'use strict';

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// TODO(Person A): confirm the real role enum from your Zod auth schema —
// 'fleet_manager' is confirmed from your Postman test, the others are guesses.
const ROLES = ['fleet_manager', 'admin', 'maintenance_staff'];

export default function Register() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'fleet_manager' });
  const [formError, setFormError] = useState(null);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    try {
      await register(form);
      navigate('/drivers', { replace: true });
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30">
            <span className="text-base font-bold">T</span>
          </div>
          <h1 className="text-lg font-semibold text-zinc-50">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-500">Get set up on the TransitOps console.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <Field label="Full Name">
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              className={inputClasses()}
            />
          </Field>

          <div className="mt-4">
            <Field label="Email">
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@transitops.com"
                className={inputClasses()}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Password">
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className={inputClasses()}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Role">
              <select name="role" value={form.role} onChange={handleChange} className={inputClasses()}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          {formError && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function inputClasses() {
  return 'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30';
}
