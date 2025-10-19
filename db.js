// Shim for legacy require('./db') -> prefer compiled TypeScript output
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  module.exports = require('./dist/db');
} catch (e) {
  console.error('\nThis repository was migrated to TypeScript.');
  console.error('Run `npm run dev` to use the TypeScript dev server, or:');
  console.error('  npm run build');
  console.error('  npm start');
  process.exit(1);
}
