/**
 * Generates the Import Studio seed (`pams-app/js/importedData.seed.js`) from the
 * cleaned migration export (`pams_migration_ready.xlsx`).
 *
 * Usage:
 *   node server/scripts/import-migration-ready.js
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_WORKBOOK = path.join(ROOT, 'pams_migration_ready.xlsx');
const OUTPUT_SEED = path.join(ROOT, 'pams-app', 'js', 'importedData.seed.js');
const SNAPSHOT_JSON = path.join(ROOT, 'pams-app', 'data', 'importedData.snapshot.json');
const SNAPSHOT_JSON_LEGACY = path.join(ROOT, 'import-studio', 'importedData.snapshot.json');
const ADDITIONAL_CSV = path.join(ROOT, 'pams_migration_ready_v2.csv');

const clean = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }
  return String(value).trim();
};

const toIsoDate = (value) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const trimmed = String(value).trim();
  if (!trimmed) return '';

  const match = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(trimmed);
  if (match) {
    let part1 = parseInt(match[1], 10);
    let part2 = parseInt(match[2], 10);
    const year =
      match[3].length === 2
        ? 2000 + parseInt(match[3], 10)
        : parseInt(match[3], 10);

    let day = part1;
    let month = part2;

    if (part1 > 12 && part2 <= 12) {
      day = part1;
      month = part2;
    } else if (part2 > 12 && part1 <= 12) {
      day = part2;
      month = part1;
    } else if (part1 <= 12 && part2 <= 12) {
      day = part2;
      month = part1;
    }

    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(candidate.getTime())) {
      return candidate.toISOString();
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return '';
};

const toMonthKey = (isoDate) => {
  if (!isoDate) return '';
  return isoDate.slice(0, 7);
};

const deriveDisplayName = (identifier) => {
  if (!identifier) return '';
  const localPart = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  return localPart
    .split(/[._\s]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

const readWorkbook = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration workbook not found at ${filePath}.`);
  }
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const [firstSheet] = workbook.SheetNames;
  if (!firstSheet) {
    throw new Error('No worksheets found in migration workbook.');
  }
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });
};

const buildRecord = (row, index) => {
  const activityCategory = clean(row['Activity Category']).toLowerCase();
  const isInternal = activityCategory === 'internal';

  const activityDate = toIsoDate(row.Date);
  const assignedEmail = clean(row['Presales Username']).toLowerCase();
  const assignedName = deriveDisplayName(assignedEmail) || clean(row['Presales Username']);

  const internalDescription = clean(row['Internal Description']);
  const externalDescription = clean(row.Description);

  const projectName = clean(
    isInternal ? row['Internal Topic'] || row['Project Name'] : row['Project Name']
  );

  const summary = [
    isInternal ? clean(row['Internal Activity Name']) : '',
    externalDescription || internalDescription
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    id: `migration-${index + 1}`,
    source: 'pams_migration_ready',
    sheetRow: index + 2,
    accountName: clean(row['Account Name']),
    projectName,
    sfdcLink: clean(row['SFDC Link']),
    salesRep: clean(row['Sales Rep Name']),
    salesRepOriginal: clean(row['Sales Rep Name']),
    salesRepPlaceholder: false,
    salesRepRegionOriginal: '',
    salesRepRegion: '',
    activityType: clean(row['Activity Type']) || (isInternal ? 'Internal Activity' : 'Activity'),
    activityDate,
    status: 'resolved',
    requiresReview: false,
    flags: [],
    notes: '',
    importNotes: [],
    activitySummary: summary,
    isInternalCandidate: isInternal,
    assignedUserEmail: assignedEmail,
    assignedUserName: assignedName,
    assignedUserId: assignedEmail || assignedName || '',
    accessType: '',
    raw: {
      activityCategory: clean(row['Activity Category']),
      products: clean(row.Products),
      channels: clean(row.Channels),
      callType: clean(row['Call Type']),
      timeSpentType: clean(row['Time Spent Type']),
      timeSpentValue: clean(row['Time Spent Value']),
      internalActivityName: clean(row['Internal Activity Name']),
      internalTopic: clean(row['Internal Topic']),
      internalDescription,
      description: externalDescription
    },
    createdAt: new Date().toISOString(),
    updatedAt: null,
    monthOfActivity: toMonthKey(activityDate)
  };
};

const main = () => {
  console.log('🔄  Loading migration workbook…');
  const rows = readWorkbook(SOURCE_WORKBOOK);
  console.log(`• Found ${rows.length} rows in migration export`);

  const records = rows.map((row, index) => buildRecord(row, index));
  if (fs.existsSync(ADDITIONAL_CSV)) {
    const januaryWorkbook = XLSX.readFile(ADDITIONAL_CSV, { cellDates: true });
    const [firstSheet] = januaryWorkbook.SheetNames;
    if (firstSheet) {
      const januaryRows = XLSX.utils.sheet_to_json(
        januaryWorkbook.Sheets[firstSheet],
        {
          defval: '',
          raw: false
        }
      );
      const januaryRecords = januaryRows
        .map((row, index) => {
          const record = buildRecord(row, index);
          return {
            ...record,
            id: `migration-jan-${index + 1}`,
            source: 'pams_migration_ready_v2'
          };
        })
        .filter((record) => record.monthOfActivity === '2025-01');
      if (januaryRecords.length) {
        console.log(
          `• Merging ${januaryRecords.length} January activities from ${ADDITIONAL_CSV}`
        );
        records.push(...januaryRecords);
      }
    }
  }
  const version = new Date().toISOString();

  const jsonPayload = JSON.stringify(records, null, 2);
  fs.mkdirSync(path.dirname(SNAPSHOT_JSON), { recursive: true });
  fs.writeFileSync(SNAPSHOT_JSON, jsonPayload, 'utf8');
  console.log(`✅  Snapshot written to ${SNAPSHOT_JSON}`);
  if (SNAPSHOT_JSON_LEGACY) {
    fs.mkdirSync(path.dirname(SNAPSHOT_JSON_LEGACY), { recursive: true });
    fs.writeFileSync(SNAPSHOT_JSON_LEGACY, jsonPayload, 'utf8');
    console.log(`✅  Snapshot written to ${SNAPSHOT_JSON_LEGACY}`);
  }

  const header = [];
  header.push('/* eslint-disable */');
  header.push(`// Auto-generated on ${version} by import-migration-ready.js`);
  header.push(`// Loaded ${records.length} records from "pams_migration_ready.xlsx"`);
  header.push(`window.__PAMS_IMPORTED_DATA_VERSION__ = '${version}';`);
  header.push(
    `window.__PAMS_SUMMARY__ = ${JSON.stringify(
      records.map((record) => ({
        id: record.id,
        accountName: record.accountName,
        projectName: record.projectName,
        salesRep: record.salesRep,
        salesRepEmail: record.salesRepEmail,
        monthOfActivity: record.monthOfActivity,
        activityDate: record.activityDate,
        assignedUserEmail: record.assignedUserEmail,
        assignedUserName: record.assignedUserName,
        activityType: record.activityType,
        isInternalCandidate: record.isInternalCandidate
      })),
      null,
      2
    )};`
  );

  fs.writeFileSync(`${OUTPUT_SEED}`, `${header.join('\n')}\n`, 'utf8');
  console.log(`✅  Seed written to ${OUTPUT_SEED}`);
};

main();
