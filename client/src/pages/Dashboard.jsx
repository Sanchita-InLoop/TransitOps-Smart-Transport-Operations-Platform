function Dashboard() {
  const stats = {
    availableVehicles: 6,
    activeTrips: 3,
    driversOffDuty: 2,
    expiringLicenses: 1,
  };

  return (
    <section className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-slate-500 text-sm">Available Vehicles</p>
          <p className="text-3xl font-bold mt-1">{stats.availableVehicles}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-slate-500 text-sm">Active Trips</p>
          <p className="text-3xl font-bold mt-1">{stats.activeTrips}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-slate-500 text-sm">Drivers Off Duty</p>
          <p className="text-3xl font-bold mt-1">{stats.driversOffDuty}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-slate-500 text-sm">Expiring Licenses</p>
          <p className="text-3xl font-bold mt-1">{stats.expiringLicenses}</p>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;