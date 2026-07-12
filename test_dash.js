const { query } = require('./src/config/db');

async function test() {
  try {
    const res = await query(`SELECT status, COUNT(*)::int AS count FROM vehicles GROUP BY status`);
    console.log('vehicles', res.rows);
  } catch(e) { console.error('vehicles failed', e.message); }
  
  try {
    const res = await query(`SELECT status, COUNT(*)::int AS count FROM drivers GROUP BY status`);
    console.log('drivers', res.rows);
  } catch(e) { console.error('drivers failed', e.message); }
  
  try {
    const res = await query(`SELECT COUNT(*)::int AS count FROM trips WHERE status = 'dispatched'`);
    console.log('trips', res.rows);
  } catch(e) { console.error('trips failed', e.message); }
  
  try {
    const res = await query(`SELECT COUNT(*)::int AS count FROM maintenance_logs WHERE status = 'open'`);
    console.log('maintenance', res.rows);
  } catch(e) { console.error('maintenance failed', e.message); }
  
  process.exit();
}

test();
