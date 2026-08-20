const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  const query = "SELECT u.id, u.email, u.role, d.is_online, w.balance, p.vehicle_type FROM users u LEFT JOIN driver_locations d ON d.user_id = u.id LEFT JOIN driver_wallets w ON w.driver_id = u.id LEFT JOIN driver_profiles p ON p.user_id = u.id WHERE u.role = 'DRIVER'";
  const res = await client.query(query);
  console.table(res.rows);
  client.end();
}).catch(console.error);
