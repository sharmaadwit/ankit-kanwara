/**
 * Preload migration data and wins on server startup.
 * - If migration_draft_meta is missing: load pams_migration_ready_v3.csv → draft store.
 * - If migration_wins is missing: load 2025 Wins with SFDC xlsx → migration_wins.
 * Runs once after DB is ready; does not overwrite existing data.
 */

const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');
const logger = require('../logger');
const { parseMigrationCSV, writeDraftToStorage } = require('./migrationImport');

const MIGRATION_CSV = 'pams_migration_ready_v3.csv';
const WINS_FILENAME = '2025 Wins with SFDC-2026-02-02-17-56-23.xlsx';
const PRESALES_DATA_PATTERNS = ['20205-26 data presales.xlsx', 'data presales.xlsx', 'presales data.xlsx'];

function getMigrationCsvPath() {
  const envPath = process.env.MIGRATION_CSV_PATH;
  if (envPath && typeof envPath === 'string' && envPath.trim()) {
    return path.resolve(envPath.trim());
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'migration-source', MIGRATION_CSV),
    path.join(cwd, 'Migration Source Data', MIGRATION_CSV),
    path.join(cwd, '..', 'Project-PAT-LocalArchive', '2026-02-11_161551', MIGRATION_CSV)
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) { /* ignore */ }
  }
  return null;
}

function getWinsPath() {
  const envPath = process.env.WINS_FILE_PATH;
  if (envPath && typeof envPath === 'string' && envPath.trim()) {
    return path.resolve(envPath.trim());
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'migration-source', WINS_FILENAME),
    path.join(cwd, 'Migration Source Data', WINS_FILENAME),
    path.join(cwd, '..', 'Presales Year End Report 2025 - 26', WINS_FILENAME)
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) { /* ignore */ }
  }
  return null;
}

function getPresalesDataPath() {
  const cwd = process.cwd();
  const baseDirs = [
    path.join(cwd, 'migration-source'),
    path.join(cwd, 'Migration Source Data'),
    path.join(cwd, '..', 'Presales Year End Report 2025 - 26')
  ];
  for (const dir of baseDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const name of PRESALES_DATA_PATTERNS) {
        const p = path.join(dir, name);
        if (fs.existsSync(p)) return p;
      }
    } catch (_) { /* ignore */ }
  }
  return null;
}

async function getStorageValue(key) {
  const pool = getPool();
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1;', [key]);
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].value);
  } catch (_) {
    return rows[0].value;
  }
}

async function setStorageValue(key, value) {
  const pool = getPool();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await pool.query(
    `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW();`,
    [key, serialized]
  );
}

function loadWinsFromXlsx(filePath) {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    logger.warn('preload_wins_parse_failed', { path: filePath, message: e.message });
    return [];
  }
}

async function runPreload() {
  try {
    const existingMeta = await getStorageValue('migration_draft_meta');
    if (!existingMeta || !existingMeta.importedAt) {
      const csvPath = getMigrationCsvPath();
      if (csvPath) {
        const csv = fs.readFileSync(csvPath, 'utf8');
        const { accounts, activitiesByMonth, internalActivities, errors } = parseMigrationCSV(csv);
        await writeDraftToStorage(accounts, activitiesByMonth, internalActivities);
        const totalActivities = Object.values(activitiesByMonth).reduce((s, arr) => s + arr.length, 0);
        logger.info('preload_migration_done', {
          accountCount: accounts.length,
          activityCount: totalActivities,
          internalCount: internalActivities.length,
          path: csvPath
        });
      } else {
        logger.info('preload_migration_skipped', { reason: 'no_csv_path' });
      }
    } else {
      logger.info('preload_migration_skipped', { reason: 'already_loaded' });
    }

    const existingWins = await getStorageValue('migration_wins');
    if (!existingWins || !Array.isArray(existingWins) || existingWins.length === 0) {
      const winsPath = getWinsPath();
      if (winsPath) {
        const winsRows = loadWinsFromXlsx(winsPath);
        await setStorageValue('migration_wins', winsRows);
        logger.info('preload_wins_done', { rowCount: winsRows.length, path: winsPath });
      } else {
        logger.info('preload_wins_skipped', { reason: 'no_wins_path' });
      }
    } else {
      logger.info('preload_wins_skipped', { reason: 'already_loaded' });
    }

    const existingPresales = await getStorageValue('migration_presales_data');
    if (!existingPresales || !Array.isArray(existingPresales) || existingPresales.length === 0) {
      const presalesPath = getPresalesDataPath();
      if (presalesPath) {
        const presalesRows = loadWinsFromXlsx(presalesPath);
        await setStorageValue('migration_presales_data', presalesRows);
        logger.info('preload_presales_done', { rowCount: presalesRows.length, path: presalesPath });
      }
    }
  } catch (error) {
    logger.error('preload_migration_failed', { message: error.message, stack: error.stack });
  }
}

module.exports = { runPreload };
