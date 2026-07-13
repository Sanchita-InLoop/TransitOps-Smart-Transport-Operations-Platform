import { useState, useEffect } from 'react';
import { apiClient, API_BASE_URL } from '../Apiclient';

const BASE_URL = API_BASE_URL;

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/reports/vehicles').then((res) => setReports(res.data ?? [])).catch((e) => setError(e.message));
  }, []);

  function downloadCsv() {
    const token = localStorage.getItem('transitops_token');
    fetch(`${BASE_URL}/reports/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vehicle_reports.csv';
        a.click();
      });
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-50">Reports</h1>
        <button onClick={downloadCsv} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700">
          Export CSV
        </button>
      </div>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="p-3 text-left font-medium">Vehicle</th>
              <th className="p-3 text-left font-medium">Fuel Efficiency</th>
              <th className="p-3 text-left font-medium">Operational Cost</th>
              <th className="p-3 text-left font-medium">ROI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-950">
            {reports.map((r) => (
              <tr key={r.vehicle_id} className="text-zinc-200">
                <td className="p-3">{r.registration_number}</td>
                <td className="p-3">{r.fuel_efficiency?.toFixed(2) ?? 'N/A'}</td>
                <td className="p-3">{r.operational_cost?.toFixed(2)}</td>
                <td className="p-3">{r.roi !== null ? r.roi.toFixed(2) : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}