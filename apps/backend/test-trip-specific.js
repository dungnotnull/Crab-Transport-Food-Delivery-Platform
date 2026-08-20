const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  try {
    const q1 = "SELECT * FROM trips WHERE id = 'fe690ba6-40c1-4197-bf43-52fd478add63'";
    const res = await client.query(q1);
    console.log(res.rows[0]);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
});
