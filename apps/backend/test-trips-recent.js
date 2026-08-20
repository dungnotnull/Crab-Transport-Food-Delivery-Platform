const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  try {
    const q1 = "SELECT id, customer_id, status, created_at FROM trips WHERE created_at >= NOW() - INTERVAL '30 minutes'";
    const res = await client.query(q1);
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
});
