const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  try {
    const q1 = "SELECT id, customer_id, driver_id, status, vehicle_type, created_at FROM trips WHERE status IN ('ACCEPTED', 'IN_TRANSIT', 'DRIVER_ARRIVING', 'ARRIVED_AT_PICKUP') ORDER BY created_at DESC";
    const res = await client.query(q1);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
});
