// Migration shim: project has been migrated to TypeScript under `src/`.
// Run `npm run dev` to use the TypeScript dev server (ts-node-dev), or
// `npm run build && npm start` to build and run the compiled output in `dist/`.

try {
  // If a compiled server exists, prefer running it.
  // This allows `node server.js` to still work after `npm run build`.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const compiled = require('./dist/server');
  if (compiled && typeof compiled === 'function') {
    compiled();
  }
} catch (e) {
  console.error('\nThis repository was migrated to TypeScript.');
  console.error('Run `npm run dev` to start the dev server, or:');
  console.error('  npm run build');
  console.error('  npm start');
  console.error('\nIf you intended to run the TypeScript dev server, install dev dependencies and run `npm run dev`.');
  process.exit(1);
}

