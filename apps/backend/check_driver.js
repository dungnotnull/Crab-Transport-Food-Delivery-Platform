const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/crab_db'
});
ds.initialize().then(() => {
  return ds.query("SELECT d.is_online, d.active_trip_id, w.status, w.balance, p.average_rating, p.vehicle_type, ST_AsText(d.current_location) as location FROM driver_locations d LEFT JOIN driver_wallets w ON w.driver_id = d.user_id LEFT JOIN driver_profiles p ON p.user_id = d.user_id WHERE d.user_id = '7be98b30-9c9d-4106-bff1-49ad87739d8c'");
}).then(r => {
  console.dir(r, {depth: null});
  return ds.destroy();
}).catch(console.error);
