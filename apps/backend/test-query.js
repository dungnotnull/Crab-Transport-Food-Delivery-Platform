const { Client } = require('pg');
const client = new Client('postgres://postgres:postgres@localhost:5432/crab_db');

client.connect().then(async () => {
  const origin = { type: 'Point', coordinates: [106.68937, 10.782363] };
  
  // Test 1: Distances to all drivers
  const q1 = `SELECT user_id, ST_Distance(current_location::geography, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography) as dist FROM driver_locations`;
  const res1 = await client.query(q1, [JSON.stringify(origin)]);
  console.log('Distances:', res1.rows);

  // Test 2: Full query
  const q2 = `SELECT driverLocation.user_id, wallet.balance, wallet.status, profile.vehicle_type
    FROM driver_locations driverLocation
    INNER JOIN driver_wallets wallet ON wallet.driver_id = driverLocation.user_id
    INNER JOIN driver_profiles profile ON profile.user_id = driverLocation.user_id
    WHERE driverLocation.is_online = true
    AND driverLocation.active_trip_id IS NULL
    AND wallet.status = 'ACTIVE'
    AND wallet.balance >= 100000
    AND profile.average_rating >= 3.5
    AND ST_DWithin(driverLocation.current_location::geography, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, 3000)
  `;
  const res2 = await client.query(q2, [JSON.stringify(origin)]);
  console.log('Full matching drivers:', res2.rows);

  client.end();
}).catch(console.error);
