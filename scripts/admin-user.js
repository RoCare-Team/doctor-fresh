/**
 * Add an admin, or change an existing admin's password.
 *
 *   node scripts/admin-user.js
 *
 * It asks for the details in your terminal, and the password is not echoed as
 * you type — so it never lands in a chat, a file, or your shell history.
 *
 * The password is stored as SHA-1, which is what the existing PHP admin panel
 * expects, so the same login works in both panels.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');
const { Writable } = require('node:stream');
const mysql = require('mysql2/promise');

/* ------------------------------------------------------------------ config */

const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error('Missing DB_HOST / DB_USER / DB_NAME. Fill .env.local first.');
  process.exit(1);
}

/* ------------------------------------------------------------------ prompts */

// A stdout wrapper that can be told to stop echoing, so the password is not
// printed to the screen while it is typed.
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});

const rl = readline.createInterface({ input: process.stdin, output, terminal: true });

const ask = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => resolve(answer.trim()));
});

const askSecret = (question) => new Promise((resolve) => {
  process.stdout.write(question);
  muted = true;
  rl.question('', (answer) => {
    muted = false;
    process.stdout.write('\n');
    resolve(answer.trim());
  });
});

/* --------------------------------------------------------------------- run */

(async () => {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD || '',
    database: DB_NAME,
  });

  const [existing] = await connection.execute('SELECT `admin_id`, `name`, `email` FROM `admin`');
  console.log('\nAdmins that can sign in today:');
  for (const a of existing) console.log(`  ${String(a.admin_id).padStart(3)}  ${a.email}  (${a.name})`);

  const email = (await ask('\nEmail for the admin: ')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    console.error('That is not a valid email address.');
    process.exit(1);
  }

  const match = existing.find((a) => String(a.email || '').trim().toLowerCase() === email);
  console.log(match ? `\nUpdating the password for ${match.name}.` : '\nThis email is new — creating an admin.');

  const password = await askSecret('Password (not shown as you type): ');
  if (password.length < 8) {
    console.error('Use at least 8 characters.');
    process.exit(1);
  }

  const again = await askSecret('Type it again: ');
  if (password !== again) {
    console.error('The two passwords do not match.');
    process.exit(1);
  }

  // SHA-1, matching what the PHP panel stores.
  const hash = crypto.createHash('sha1').update(password).digest('hex');

  if (match) {
    await connection.execute('UPDATE `admin` SET `password` = ? WHERE `admin_id` = ?', [hash, match.admin_id]);
    console.log(`\nPassword updated for ${match.name} (${email}).`);
  } else {
    const name = (await ask('Full name: ')) || 'Admin';
    const phone = (await ask('Mobile (optional): ')).replace(/\D/g, '');

    // Role 1 is the master role in the `role` table — full access.
    await connection.execute(
      'INSERT INTO `admin` (`name`, `email`, `password`, `phone`, `address`, `zip`, `role`, `timestamp`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hash, phone, '', '', '1', String(Math.floor(Date.now() / 1000))],
    );
    console.log(`\nAdmin created: ${name} (${email}) with full access.`);
  }

  console.log('Sign in at /admin with that email and password.\n');

  await connection.end();
  rl.close();
})().catch((err) => {
  console.error('Failed:', err.code || err.message);
  process.exit(1);
});
