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
  const result = await client`SELECT COUNT(*) as cnt FROM prices`;
  console.log('pg npm works, prices count:', result[0].cnt);
  await client.end();
}
test().catch(e => console.error(e.message));
