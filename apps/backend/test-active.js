const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  try {
    const q1 = "SELECT id, customer_id, status, vehicle_type, ST_AsText(pickup_location) as pickup, created_at FROM trips WHERE status = 'FINDING_DRIVER' ORDER BY created_at DESC";
    const res = await client.query(q1);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
});
