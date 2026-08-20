const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/crab_db'
});
ds.initialize().then(() => {
  return ds.query("SELECT * FROM system_configs");
}).then(r => {
  console.dir(r, {depth: null});
  return ds.destroy();
}).catch(console.error);
