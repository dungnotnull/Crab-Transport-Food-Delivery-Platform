const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  try {
    const q1 = "SELECT id, status, vehicle_type, ST_AsText(pickup_location) as pickup, created_at FROM trips WHERE customer_id = 'a19c1df3-7d45-47b4-83bb-f879f1987533' ORDER BY created_at DESC LIMIT 1";
    const res = await client.query(q1);
    console.log('Customer Trip:', res.rows[0]);

    const q2 = "SELECT d.user_id, d.is_online, d.active_trip_id, ST_AsText(d.current_location) as loc, w.balance, w.status, p.vehicle_type FROM driver_locations d JOIN driver_wallets w ON w.driver_id = d.user_id JOIN driver_profiles p ON p.user_id = d.user_id WHERE d.user_id = '46944afa-b3a1-46c4-937d-dee321231b7e'";
    const res2 = await client.query(q2);
    console.log('Driver Info:', res2.rows[0]);

    if (res.rows.length > 0 && res2.rows.length > 0) {
       const trip = res.rows[0];
       const q3 = "SELECT ST_Distance(d.current_location::geography, t.pickup_location::geography) as dist FROM driver_locations d, trips t WHERE d.user_id = '46944afa-b3a1-46c4-937d-dee321231b7e' AND t.id = $1";
       const res3 = await client.query(q3, [trip.id]);
       console.log('Distance between them (meters):', res3.rows[0].dist);
    }

  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
});
