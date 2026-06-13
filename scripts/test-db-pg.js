const { Client } = require('pg');
const fs = require('fs');

// Try connecting with different SSL options
const urls = [
  process.env.DATABASE_URL,
  process.env.DATABASE_URL?.replace('sslmode=require', 'sslmode=no-verify'),
];

async function tryConnect(url, label) {
  console.log(`\n--- Trying ${label} ---`);
  console.log(`URL: ${url?.slice(0, 60)}...`);
  try {
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('Connected! Server time:', res.rows[0].now);
    await client.end();
    return true;
  } catch (e) {
    console.log('Failed:', e.message.slice(0, 200));
    return false;
  }
}

(async () => {
  const envUrl = fs.readFileSync('.env', 'utf-8').match(/DATABASE_URL="(.+)"/)?.[1];
  process.env.DATABASE_URL = envUrl;

  let ok = false;
  ok = ok || await tryConnect(envUrl, 'original SSL');
  if (!ok) ok = ok || await tryConnect(envUrl?.replace('sslmode=require', ''), 'no sslmode');
  if (!ok) ok = ok || await tryConnect(envUrl, 'rejectUnauthorized=false');
  if (!ok) {
    // Try direct connection (not pooler)
    const directUrl = envUrl?.replace('-pooler', '');
    ok = ok || await tryConnect(directUrl, 'direct (no pooler)');
  }
  if (!ok) {
    console.log('\nAll connection attempts failed');
  }
})();
