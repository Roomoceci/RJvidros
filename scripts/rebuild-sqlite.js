const { spawnSync } = require('child_process');

if (process.platform !== 'linux' || process.env.RENDER !== 'true') {
  process.exit(0);
}

console.log('Render detectado: recompilando sqlite3 a partir do codigo-fonte...');

const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['rebuild', 'sqlite3', '--build-from-source'],
  { stdio: 'inherit' }
);

process.exit(result.status || 0);
