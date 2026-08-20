const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  try {
    const q1 = "SELECT * FROM users WHERE id = 'a19c1df3-7d45-47b4-83bb-f879f1987533'";
    const res = await client.query(q1);
    console.log(res.rows[0]);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
});
