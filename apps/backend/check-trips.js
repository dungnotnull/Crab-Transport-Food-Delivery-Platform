const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/crab_db'
});
ds.initialize().then(() => {
  return ds.query("SELECT id, status, customer_id, driver_id FROM trips WHERE customer_id = 'a19c1df3-7d45-47b4-83bb-f879f1987533' ORDER BY created_at DESC LIMIT 5");
}).then(r => {
  console.dir(r, {depth: null});
  return ds.destroy();
}).catch(console.error);
