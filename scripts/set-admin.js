const path = require('path');
const DatabaseManager = require('../backend/database');
const { hashPassword } = require('../backend/utils/security');

const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || '';
const adminName = String(process.env.ADMIN_NAME || 'Administrador').trim();
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'rjvidros.db');

if (!adminEmail || !adminPassword) {
  console.error('Configure ADMIN_EMAIL e ADMIN_PASSWORD antes de executar.');
  process.exit(1);
}

const db = new DatabaseManager(dbPath);

async function main() {
  const existing = await db.getUserByEmail(adminEmail);

  if (existing) {
    await db.run('UPDATE users SET password = ?, name = ? WHERE id = ?', [hashPassword(adminPassword), adminName, existing.id]);
    console.log(`Admin atualizado: ${adminEmail}`);
  } else {
    await db.run('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', [adminEmail, hashPassword(adminPassword), adminName]);
    console.log(`Admin criado: ${adminEmail}`);
  }

  await db.close();
}

main().catch(async (error) => {
  console.error(error.message);
  await db.close();
  process.exit(1);
});
