const fs = require('fs');
const path = require('path');

const confirmed = String(process.env.CONFIRM_RESET_DB || '').toLowerCase() === 'true';
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'rjvidros.db');
const resolvedPath = path.resolve(dbPath);

if (!confirmed) {
  console.error('Reset cancelado. Execute com CONFIRM_RESET_DB=true para confirmar.');
  process.exit(1);
}

if (!fs.existsSync(resolvedPath)) {
  console.log(`Banco não encontrado em: ${resolvedPath}`);
  process.exit(0);
}

fs.unlinkSync(resolvedPath);
console.log(`Banco removido: ${resolvedPath}`);
console.log('Reinicie o serviço para recriar o banco com ADMIN_EMAIL e ADMIN_PASSWORD.');
