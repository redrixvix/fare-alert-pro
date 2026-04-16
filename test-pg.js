const { default: pg } = require('postgres');
const client = pg({
  host: 'ep-curly-cherry-anf8e3xu.c-6.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_1pEZt0ewmQiJ',
  ssl: 'require',
  connect_timeout: 15,
});
async function test() {
  const rows = await client`SELECT route, cabin, COUNT(*) as cnt FROM prices GROUP BY route, cabin ORDER BY route, cabin`;
  console.log('Prices by route+cabin:');
  rows.forEach(r => console.log(' ', r.route, r.cabin, ':', r.cnt));
  await client.end();
}
test().catch(e => console.error(e.message));
