const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const projectRoot = process.cwd();
const localEnvPath = path.resolve(projectRoot, '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  const samplePath = path.resolve(__dirname, '..', 'env.sample');
  if (fs.existsSync(samplePath)) {
    dotenv.config({ path: samplePath });
  }
}

const { initDb, closePool } = require('../db');

(async () => {
  try {
    await initDb();
    console.log('Database migration completed.');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Database migration failed:', error);
    await closePool();
    process.exit(1);
  }
})();

