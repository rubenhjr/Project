try {
  // prefer compiled controllers from dist/
  module.exports = require('../dist/controllers/movies');
} catch (e) {
  console.error('\nControllers were migrated to TypeScript.');
  console.error('Run `npm run dev` to start the dev server, or build first with `npm run build`.');
  throw e;
}
