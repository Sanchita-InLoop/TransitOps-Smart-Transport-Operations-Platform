const { Client } = require('pg');

async function test() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`SELECT status, COUNT(*)::int AS count FROM trips GROUP BY status`);
    console.log('trips ok');
    await client.query(`SELECT COALESCE(SUM(liters), 0)::float AS total_liters, COALESCE(SUM(cost), 0)::float AS total_cost FROM fuel_logs`);
    console.log('fuel_logs ok');
    await client.query(`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(cost), 0)::float AS total_cost FROM maintenance_logs GROUP BY status`);
    console.log('maintenance_logs ok');
    await client.query(`SELECT COALESCE(SUM(amount), 0)::float AS total_amount FROM expenses`);
    console.log('expenses ok');
  } catch(e) {
    console.error(e.message);
  }
  await client.end();
}

test().catch(console.error);
