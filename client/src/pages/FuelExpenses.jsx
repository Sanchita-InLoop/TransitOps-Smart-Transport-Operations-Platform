import { useState, useEffect } from 'react';
import { apiClient } from '../Apiclient';

export default function FuelExpenses() {
  const [vehicles, setVehicles] = useState([]);
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', liters: '', cost: '', date: '' });
  const [expenseForm, setExpenseForm] = useState({ vehicle_id: '', type: 'toll', description: '', amount: '', date: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiClient.get('/vehicles').then(setVehicles).catch(() => {});
  }, []);

  async function submitFuel(e) {
    e.preventDefault();
    setMessage('');
    try {
      await apiClient.post('/fuel-logs', fuelForm);
      setMessage('Fuel log added successfully.');
      setFuelForm({ vehicle_id: '', liters: '', cost: '', date: '' });
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function submitExpense(e) {
    e.preventDefault();
    setMessage('');
    try {
      await apiClient.post('/expenses', expenseForm);
      setMessage('Expense added successfully.');
      setExpenseForm({ vehicle_id: '', type: 'toll', description: '', amount: '', date: '' });
    } catch (err) {
      setMessage(err.message);
    }
  }

  const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-50">Fuel & Expense Logging</h1>
      {message && <p className="text-sm text-indigo-400">{message}</p>}

      <form onSubmit={submitFuel} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="font-semibold text-zinc-200">Log Fuel</h2>
        <select className={inputClass} value={fuelForm.vehicle_id}
          onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })} required>
          <option value="">Select vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.registration_number}</option>
          ))}
        </select>
        <input type="number" step="0.01" placeholder="Liters" className={inputClass}
          value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Cost" className={inputClass}
          value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} required />
        <input type="date" className={inputClass}
          value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} required />
        <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-indigo-400">
          Add Fuel Log
        </button>
      </form>

      <form onSubmit={submitExpense} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="font-semibold text-zinc-200">Log Expense</h2>
        <select className={inputClass} value={expenseForm.vehicle_id}
          onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })} required>
          <option value="">Select vehicle</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.registration_number}</option>
          ))}
        </select>
        <select className={inputClass} value={expenseForm.type}
          onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
          <option value="toll">Toll</option>
          <option value="misc">Misc</option>
          <option value="other">Other</option>
        </select>
        <input type="text" placeholder="Description" className={inputClass}
          value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
        <input type="number" step="0.01" placeholder="Amount" className={inputClass}
          value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
        <input type="date" className={inputClass}
          value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-zinc-50 hover:bg-emerald-500">
          Add Expense
        </button>
      </form>
    </div>
  );
}