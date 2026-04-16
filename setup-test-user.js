const bcrypt = require('bcryptjs');
const postgres = require('postgres');

const pw = 'FareAlert2026!';
const hash = bcrypt.hashSync(pw, 10);
console.log('password:', pw);

async function run() {
  const client = postgres({
    host: 'ep-curly-cherry-anf8e3xu.c-6.us-east-1.aws.neon.tech',
    database: 'neondb',
    user: 'neondb_owner',
    password: 'npg_1pEZt0ewmQiJ',
    ssl: 'require',
    connect_timeout: 15,
  });

  const [user] = await client`SELECT id, email FROM users WHERE email = ${'alex@farealertpro.com'} LIMIT 1`;
  if (user) {
    await client`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id}`;
    console.log('Updated existing user:', user.email);
  } else {
    const [newUser] = await client`INSERT INTO users (email, password_hash) VALUES (${'alex@farealertpro.com'}, ${hash}) RETURNING id`;
    console.log('Created new user, id:', newUser.id);
  }

  await client.end();
  console.log('Done');
}

run().catch(e => console.error(e.message));
