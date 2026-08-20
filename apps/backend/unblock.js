const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/crab_db'
});
ds.initialize().then(() => {
  return ds.query("UPDATE driver_wallets SET status = 'ACTIVE' WHERE driver_id = '7be98b30-9c9d-4106-bff1-49ad87739d8c'");
}).then(r => {
  console.log('Updated rows:', r[1]);
  return ds.destroy();
}).catch(console.error);
