/**
 * Super Agent CSV/JSON import: parse and validate using the same rules as pams-app bulkImport.js
 * (external/internal rows, activity types, duplicates). Server-side commit writes accounts + activities.
 */

const crypto = require('crypto');
const zlib = require('zlib');
const { getPool } = require('../db');
const logger = require('../logger');
const { validateAccounts } = require('../lib/storageValidation');
const storageRouter = require('../routes/storage');
const { dualWriteAfterStorageWrite } = require('../lib/normalizedDualWrite');

const GZIP_PREFIX = '__gz__';
const LZ_PREFIX = '__lz__';

const MAX_ROWS = 500;
const BATCH_ID_RE = /^[a-zA-Z0-9:_.-]{1,120}$/;
const IDEMPOTENCY_KEY = 'super_agent_import_idempotency';

function maybeDecompressValue(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith(LZ_PREFIX)) {
    try {
      const LZString = require('lz-string');
      const restored = LZString.decompressFromBase64(value.slice(LZ_PREFIX.length));
      if (restored != null) return restored;
    } catch (_) {
      /* ignore */
    }
    return value;
  }
  if (!value.startsWith(GZIP_PREFIX)) return value;
  try {
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (_) {
    return value;
  }
}

function parseJsonArray(raw) {
  if (raw == null || raw === '') return [];
  try {
    const decoded = typeof raw === 'string' ? maybeDecompressValue(raw) : raw;
    const parsed = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function archiveCurrentValue(client, key) {
  if (/^migration_/.test(key)) return;
  const { rows } = await client.query('SELECT value, updated_at FROM storage WHERE key = $1;', [key]);
  if (rows.length === 0) return;
  await client.query(
    `INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ($1, $2, $3, NOW());`,
    [key, rows[0].value, rows[0].updated_at]
  );
}

function generateId() {
  return crypto.randomUUID();
}

function parseCsv(text) {
  if (typeof text !== 'string') throw new Error('CSV input must be a string.');
  let t = text;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let inQuotes = false;

  const commitValue = () => {
    currentRow.push(currentValue);
    currentValue = '';
  };

  const commitRow = () => {
    if (currentRow.length > 0 || currentValue.length > 0) {
      commitValue();
      const firstCell = currentRow[0] ? currentRow[0].trim() : '';
      if (!firstCell.startsWith('#')) {
        rows.push(currentRow);
      }
      currentRow = [];
    }
  };

  for (let i = 0; i < t.length; i++) {
    const char = t[i];
    if (inQuotes) {
      if (char === '"') {
        if (t[i + 1] === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      commitValue();
    } else if (char === '\n') {
      commitRow();
    } else if (char === '\r') {
      if (t[i + 1] === '\n') continue;
      commitRow();
    } else {
      currentValue += char;
    }
  }
  commitRow();

  if (!rows.length) throw new Error('CSV file is empty.');
  return rows;
}

function normalizeHeader(header) {
  if (!header) return '';
  const cleaned = String(header).trim().toLowerCase();
  const map = {
    'activity category': 'category',
    category: 'category',
    date: 'date',
    'presales username': 'user',
    'presales user': 'user',
    'presales user username': 'user',
    'activity type': 'activityType',
    'account name': 'account',
    'project name': 'project',
    'sales rep name': 'salesRepName',
    'sales rep email': 'salesRepEmail',
    industry: 'industry',
    'sfdc link': 'sfdcLink',
    'use cases': 'useCases',
    'use case other': 'useCaseOther',
    products: 'products',
    'products other': 'productsOther',
    channels: 'channels',
    'channels other': 'channelsOther',
    'call type': 'callType',
    'description / mom': 'description',
    description: 'description',
    'poc access type': 'pocAccessType',
    'poc use case description': 'pocUseCaseDescription',
    'poc sandbox start date': 'pocSandboxStartDate',
    'poc sandbox end date': 'pocSandboxEndDate',
    'poc demo environment': 'pocDemoEnvironment',
    'poc bot trigger url': 'pocBotTriggerUrl',
    'sow link': 'sowLink',
    'rfx type': 'rfxType',
    'rfx submission deadline': 'rfxDeadline',
    'rfx google folder link': 'rfxFolderLink',
    'rfx notes': 'rfxNotes',
    'time spent type': 'timeSpentType',
    'time spent value': 'timeSpentValue',
    'internal activity name': 'internalActivityName',
    'internal topic': 'internalTopic',
    'internal description': 'internalDescription'
  };
  return map[cleaned] || cleaned;
}

function str(v) {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * Normalize JSON body row to the same key shapes bulkImport evaluateRow expects
 * (mostly lowercase legacy keys, plus camelCase from CSV normalizeHeader).
 */
function normalizeIncomingRowObject(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const g = (...keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return str(obj[k]);
      }
    }
    return '';
  };
  return {
    category: g('category', 'activityCategory', 'Activity Category'),
    date: g('date', 'Date'),
    user: g('user', 'presalesUsername', 'Presales Username'),
    activitytype: g('activitytype', 'activityType', 'Activity Type'),
    account: g('account', 'accountName', 'Account Name'),
    project: g('project', 'projectName', 'Project Name'),
    salesrepname: g('salesrepname', 'salesRepName', 'Sales Rep Name'),
    salesrepemail: g('salesrepemail', 'salesRepEmail', 'Sales Rep Email'),
    industry: g('industry', 'Industry'),
    sfdclink: g('sfdclink', 'sfdcLink', 'SFDC Link'),
    usecases: g('usecases', 'useCases', 'Use Cases'),
    usecaseother: g('usecaseother', 'useCaseOther', 'Use Case Other'),
    products: g('products', 'Products'),
    productsother: g('productsother', 'productsOther', 'Products Other'),
    channels: g('channels', 'Channels'),
    channelsother: g('channelsother', 'channelsOther', 'Channels Other'),
    calltype: g('calltype', 'callType', 'Call Type'),
    description: g('description', 'Description', 'description / mom'),
    pocaccesstype: g('pocaccesstype', 'pocAccessType', 'POC Access Type'),
    pocusecasedescription: g('pocusecasedescription', 'pocUseCaseDescription', 'POC Use Case Description'),
    pocsandboxstartdate: g('pocsandboxstartdate', 'pocSandboxStartDate', 'POC Sandbox Start Date'),
    pocsandboxenddate: g('pocsandboxenddate', 'pocSandboxEndDate', 'POC Sandbox End Date'),
    pocdemoenvironment: g('pocdemoenvironment', 'pocDemoEnvironment', 'POC Demo Environment'),
    pocbottriggerurl: g('pocbottriggerurl', 'pocBotTriggerUrl', 'POC Bot Trigger URL'),
    sowlink: g('sowlink', 'sowLink', 'SOW Link'),
    rfxtype: g('rfxtype', 'rfxType', 'RFX Type'),
    rfxdeadline: g('rfxdeadline', 'rfxDeadline', 'RFX Submission Deadline'),
    rfxfolderlink: g('rfxfolderlink', 'rfxFolderLink', 'RFX Google Folder Link'),
    rfxnotes: g('rfxnotes', 'rfxNotes', 'RFX Notes'),
    timespenttype: g('timespenttype', 'timeSpentType', 'Time Spent Type'),
    timespentvalue: g('timespentvalue', 'timeSpentValue', 'Time Spent Value'),
    internalactivityname: g('internalactivityname', 'internalActivityName', 'Internal Activity Name'),
    internaltopic: g('internaltopic', 'internalTopic', 'Internal Topic'),
    internaldescription: g('internaldescription', 'internalDescription', 'Internal Description')
  };
}

/** CSV rowObject uses normalizeHeader keys (camelCase); evaluateRow uses lowercase — bridge both. */
function expandRowAliases(row) {
  const r = { ...row };
  const pick = (a, b) => (r[a] != null && r[a] !== '' ? r[a] : r[b]);
  r.activitytype = pick('activitytype', 'activityType') || '';
  r.salesrepname = pick('salesrepname', 'salesRepName') || '';
  r.salesrepemail = pick('salesrepemail', 'salesRepEmail') || '';
  r.sfdclink = pick('sfdclink', 'sfdcLink') || '';
  r.usecases = pick('usecases', 'useCases') || '';
  r.usecaseother = pick('usecaseother', 'useCaseOther') || '';
  r.productsother = pick('productsother', 'productsOther') || '';
  r.channelsother = pick('channelsother', 'channelsOther') || '';
  r.calltype = pick('calltype', 'callType') || '';
  r.pocaccesstype = pick('pocaccesstype', 'pocAccessType') || '';
  r.pocusecasedescription = pick('pocusecasedescription', 'pocUseCaseDescription') || '';
  r.pocsandboxstartdate = pick('pocsandboxstartdate', 'pocSandboxStartDate') || '';
  r.pocsandboxenddate = pick('pocsandboxenddate', 'pocSandboxEndDate') || '';
  r.pocdemoenvironment = pick('pocdemoenvironment', 'pocDemoEnvironment') || '';
  r.pocbottriggerurl = pick('pocbottriggerurl', 'pocBotTriggerUrl') || '';
  r.sowlink = pick('sowlink', 'sowLink') || '';
  r.rfxtype = pick('rfxtype', 'rfxType') || '';
  r.rfxdeadline = pick('rfxdeadline', 'rfxDeadline') || '';
  r.rfxfolderlink = pick('rfxfolderlink', 'rfxFolderLink') || '';
  r.rfxnotes = pick('rfxnotes', 'rfxNotes') || '';
  r.timespenttype = pick('timespenttype', 'timeSpentType') || '';
  r.timespentvalue = pick('timespentvalue', 'timeSpentValue') || '';
  r.internalactivityname = pick('internalactivityname', 'internalActivityName') || '';
  r.internaltopic = pick('internaltopic', 'internalTopic') || '';
  r.internaldescription = pick('internaldescription', 'internalDescription') || '';
  return r;
}

function parseMulti(value) {
  if (!value) return [];
  return String(value)
    .split(/\||,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isInternalType(type) {
  if (!type) return false;
  const internalTypes = [
    'enablement',
    'video creation',
    'webinar',
    'event/booth hosting',
    'product feedback',
    'content creation',
    'training',
    'documentation',
    'internal meeting',
    'other'
  ];
  return internalTypes.includes(type.toLowerCase());
}

function normalizeExternalActivityType(type) {
  if (!type) return '';
  const cleaned = String(type).trim().toLowerCase();
  const map = {
    'customer call': 'customerCall',
    customercall: 'customerCall',
    customer_call: 'customerCall',
    call: 'customerCall',
    sow: 'sow',
    'statement of work': 'sow',
    poc: 'poc',
    'proof of concept': 'poc',
    rfx: 'rfx',
    rfp: 'rfx',
    pricing: 'pricing'
  };
  return map[cleaned] || '';
}

function findAccount(accounts, accountName) {
  if (!accountName) return null;
  return accounts.find((a) => (a.name || '').toLowerCase() === accountName.toLowerCase()) || null;
}

function findProject(account, projectName) {
  if (!account || !projectName) return null;
  return (account.projects || []).find((p) => (p.name || '').toLowerCase() === projectName.toLowerCase()) || null;
}

function normalizeMultiValues(values, otherText) {
  let items = Array.isArray(values)
    ? values.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
    : [];

  const lowerItems = items.map((item) => item.toLowerCase());
  if (otherText) {
    const formattedOther = `Other: ${otherText}`;
    if (lowerItems.some((item) => item === 'other' || item.startsWith('other:'))) {
      items = items.map((item) => {
        const lower = item.toLowerCase();
        if (lower === 'other' || lower.startsWith('other:')) {
          return formattedOther;
        }
        return item;
      });
    } else {
      items.push(formattedOther);
    }
  }

  return Array.from(new Set(items));
}

/**
 * Match presales identity for import: case-insensitive username first, then email.
 * (Super Agent often sends corporate email; DB-backed auth stores real username separately.)
 */
function findPresalesUser(users, identifier) {
  const raw = (identifier || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const u of users) {
    if (!u || typeof u !== 'object') continue;
    const un = (u.username || '').toLowerCase();
    if (un && un === lower) return u;
  }
  for (const u of users) {
    if (!u || typeof u !== 'object') continue;
    const em = (u.email || '').toLowerCase();
    if (em && em === lower) return u;
  }
  return null;
}

/**
 * Prefer PostgreSQL `users` table when it has active rows (production / DB auth).
 * Fall back to storage key `users` when the table is missing or empty (legacy / tests).
 */
async function loadImportUsers(pool, storageUsers) {
  if (!pool) return storageUsers;
  try {
    const { rows } = await pool.query(
      `SELECT id, username, COALESCE(email::text, '') AS email
       FROM users
       WHERE is_active = true
       ORDER BY username ASC`
    );
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email || ''
      }));
    }
  } catch (e) {
    logger.warn('super_agent_import_users_db_unavailable', { message: e.message, code: e.code });
  }
  return storageUsers;
}

function evaluateRow(row, displayRowNumber, users, accounts, existingActivities, duplicateHash, categoryHint, apiMode) {
  const r = expandRowAliases(row);
  const errors = [];
  const warnings = [];
  const messages = [];

  let category = (r.category || '').toLowerCase();
  const hintCategory = (categoryHint || '').toLowerCase();
  if (!category && hintCategory) category = hintCategory;
  if (!category && r.activitytype) {
    category = isInternalType(r.activitytype) ? 'internal' : 'external';
  }
  if (!category) errors.push('Activity Category is required (internal/external).');
  else if (!['internal', 'external'].includes(category)) {
    errors.push('Activity Category must be either "internal" or "external".');
  }
  if (category) r.category = category;

  const date = r.date;
  if (!date) errors.push('Date is required.');

  const userIdentifier = r.user;
  const user = findPresalesUser(users, userIdentifier);
  if (!user) {
    errors.push('Presales user not found (no matching username or email in the active user roster).');
  }

  if (category === 'internal') {
    return evaluateInternalRow(r, { errors, warnings, messages, user, date, displayRowNumber });
  }

  return evaluateExternalRow(r, {
    errors,
    warnings,
    messages,
    user,
    date,
    displayRowNumber,
    accounts,
    existingActivities,
    duplicateHash,
    apiMode
  });
}

function evaluateInternalRow(row, context) {
  const { errors, warnings, messages, user, date, displayRowNumber } = context;
  const activityType = row.activitytype || '';
  if (!activityType) errors.push('Activity Type is required for internal rows.');
  const timeSpentType = (row.timespenttype || '').toLowerCase();
  const timeSpentValue = row.timespentvalue;
  if (timeSpentType && !['day', 'days', 'hour', 'hours'].includes(timeSpentType)) {
    warnings.push('Time Spent Type should be "day" or "hour".');
  }
  if (timeSpentValue && Number.isNaN(Number(timeSpentValue))) {
    warnings.push('Time Spent Value must be numeric.');
  }

  const payload = {
    category: 'internal',
    displayRowNumber,
    user,
    date,
    activityType,
    timeSpentType: timeSpentType.startsWith('day') ? 'day' : timeSpentType.startsWith('hour') ? 'hour' : '',
    timeSpentValue: timeSpentValue ? Number(timeSpentValue) : '',
    activityName: row.internalactivityname || '',
    topic: row.internaltopic || '',
    description: row.internaldescription || ''
  };

  const status = errors.length ? 'error' : 'ready';
  return {
    index: displayRowNumber,
    category: 'internal',
    status,
    duplicate: false,
    messages: [...errors, ...warnings, ...messages],
    errors,
    warnings,
    payload
  };
}

function evaluateExternalRow(row, context) {
  const {
    errors,
    warnings,
    messages,
    user,
    date,
    displayRowNumber,
    accounts,
    existingActivities,
    duplicateHash,
    apiMode
  } = context;

  const accountName = (row.account || '').trim();
  const projectName = (row.project || '').trim();
  const deferAccountProject = !accountName && !projectName;
  const activityTypeRaw = row.activitytype;

  if (apiMode && deferAccountProject) {
    errors.push('Account Name and Project Name are required for API import (no post-upload mapping).');
  } else if (!deferAccountProject) {
    if (!accountName) {
      errors.push('Account Name is required unless both Account and Project are left blank (map after upload).');
    }
    if (!projectName) {
      errors.push('Project Name is required unless both Account and Project are left blank (map after upload).');
    }
  }
  if (!activityTypeRaw) errors.push('Activity Type is required for external rows.');

  const activityType = normalizeExternalActivityType(activityTypeRaw);
  if (!activityType) {
    errors.push(`Activity Type "${activityTypeRaw}" is not recognized.`);
  }

  const callDescription = row.description;
  if (activityType === 'customerCall' && !callDescription) {
    errors.push('Description is required for Customer Call activities.');
  }

  if (deferAccountProject && !apiMode) {
    const messagesDefer = errors.length
      ? []
      : ['Leave Account & Project blank in the CSV to map them here after upload (similar to linking pricing items).'];
    const statusDefer = errors.length ? 'error' : 'needs_mapping';
    const payloadDefer = {
      category: 'external',
      displayRowNumber,
      user,
      date,
      activityType,
      accountName: '',
      projectName: '',
      salesRepName: row.salesrepname || '',
      salesRepEmail: row.salesrepemail || '',
      industry: row.industry || '',
      sfdcLink: row.sfdclink || '',
      useCases: parseMulti(row.usecases),
      useCaseOther: row.usecaseother || '',
      products: parseMulti(row.products),
      productsOther: row.productsother || '',
      channels: parseMulti(row.channels),
      channelsOther: row.channelsother || '',
      callType: row.calltype || '',
      description: callDescription || '',
      pocAccessType: row.pocaccesstype || '',
      pocUseCaseDescription: row.pocusecasedescription || '',
      pocSandboxStartDate: row.pocsandboxstartdate || '',
      pocSandboxEndDate: row.pocsandboxenddate || '',
      pocDemoEnvironment: row.pocdemoenvironment || '',
      pocBotTriggerUrl: row.pocbottriggerurl || '',
      sowLink: row.sowlink || '',
      rfxType: row.rfxtype || '',
      rfxDeadline: row.rfxdeadline || '',
      rfxFolderLink: row.rfxfolderlink || '',
      rfxNotes: row.rfxnotes || '',
      newAccount: null,
      newProject: null
    };
    return {
      index: displayRowNumber,
      category: 'external',
      status: statusDefer,
      duplicate: false,
      needsMapping: !errors.length,
      messages: [...errors, ...warnings, ...messagesDefer],
      errors,
      warnings,
      payload: payloadDefer,
      newAccount: null,
      newProject: null
    };
  }

  const matchedAccount = findAccount(accounts, accountName);
  const matchedProject = matchedAccount && findProject(matchedAccount, projectName);
  const salesRepName = row.salesrepname || (matchedAccount ? matchedAccount.salesRep : '');
  const salesRepEmail = row.salesrepemail || '';
  const industry = row.industry || (matchedAccount ? matchedAccount.industry : '') || '';

  const useCases = parseMulti(row.usecases);
  const products = parseMulti(row.products);
  const channels = parseMulti(row.channels);

  const duplicateKey = `${(accountName || '').toLowerCase()}|${(projectName || '').toLowerCase()}|${date}|${activityType || ''}`;
  let duplicate = false;
  if (duplicateHash.has(duplicateKey)) {
    duplicate = true;
    messages.push('Duplicate detected within the import file.');
  } else {
    duplicateHash.add(duplicateKey);
    const existing = existingActivities.find(
      (a) =>
        !a.isInternal &&
        (a.accountName || '').toLowerCase() === (accountName || '').toLowerCase() &&
        (a.projectName || '').toLowerCase() === (projectName || '').toLowerCase() &&
        (a.date || '').substring(0, 10) === String(date || '').substring(0, 10) &&
        (a.type || '') === activityType
    );
    if (existing) {
      duplicate = true;
      messages.push('Existing activity with same account, project, date, and type detected.');
    }
  }

  const payload = {
    category: 'external',
    displayRowNumber,
    user,
    date,
    activityType,
    accountName,
    projectName,
    salesRepName,
    salesRepEmail,
    industry,
    sfdcLink: row.sfdclink || '',
    useCases,
    useCaseOther: row.usecaseother || '',
    products,
    productsOther: row.productsother || '',
    channels,
    channelsOther: row.channelsother || '',
    callType: row.calltype || '',
    description: callDescription || '',
    pocAccessType: row.pocaccesstype || '',
    pocUseCaseDescription: row.pocusecasedescription || '',
    pocSandboxStartDate: row.pocsandboxstartdate || '',
    pocSandboxEndDate: row.pocsandboxenddate || '',
    pocDemoEnvironment: row.pocdemoenvironment || '',
    pocBotTriggerUrl: row.pocbottriggerurl || '',
    sowLink: row.sowlink || '',
    rfxType: row.rfxtype || '',
    rfxDeadline: row.rfxdeadline || '',
    rfxFolderLink: row.rfxfolderlink || '',
    rfxNotes: row.rfxnotes || '',
    newAccount: matchedAccount ? null : accountName,
    newProject: matchedProject ? null : `${accountName} › ${projectName}`
  };

  const status = errors.length ? 'error' : duplicate ? 'duplicate' : 'ready';
  if (duplicate && !errors.length) {
    warnings.push('Row flagged as duplicate and will not be imported until resolved.');
  }

  return {
    index: displayRowNumber,
    category: 'external',
    status,
    duplicate,
    messages: [...errors, ...warnings, ...messages],
    errors,
    warnings,
    payload,
    newAccount: payload.newAccount,
    newProject: payload.newProject
  };
}

function rowsFromPayload(body) {
  const categoryHint = (body && body.categoryHint) || '';
  if (body && Array.isArray(body.rows)) {
    return { rows: body.rows, categoryHint, fromJsonRows: true };
  }
  if (body && typeof body.csv === 'string' && body.csv.trim()) {
    const table = parseCsv(body.csv);
    const [headerRow, ...dataRows] = table;
    const headers = headerRow.map((h) => normalizeHeader(h));
    const rows = [];
    for (let i = 0; i < dataRows.length; i++) {
      const rowValues = dataRows[i];
      const isEmpty = rowValues.every((value) => !value || !String(value).trim());
      if (isEmpty) continue;
      const rowObject = {};
      headers.forEach((key, idx) => {
        if (!key) return;
        rowObject[key] = rowValues[idx] !== undefined ? String(rowValues[idx]).trim() : '';
      });
      rows.push(rowObject);
    }
    return { rows, categoryHint, fromJsonRows: false };
  }
  throw new Error('Provide either "rows" (array of objects) or "csv" (string).');
}

function normalizeRowForEval(row, fromJsonRows) {
  if (fromJsonRows) return normalizeIncomingRowObject(row);
  return expandRowAliases(row);
}

async function loadContext(pool) {
  const { rows: uRows } = await pool.query('SELECT value FROM storage WHERE key = $1;', ['users']);
  const { rows: aRows } = await pool.query('SELECT value FROM storage WHERE key = $1;', ['accounts']);
  const { rows: actRows } = await pool.query('SELECT value FROM storage WHERE key = $1;', ['activities']);
  const storageUsers = parseJsonArray(uRows.length ? uRows[0].value : null);
  const users = await loadImportUsers(pool, storageUsers);
  const accounts = parseJsonArray(aRows.length ? aRows[0].value : null);
  const activities = parseJsonArray(actRows.length ? actRows[0].value : null);
  const { rows: intRows } = await pool.query('SELECT value FROM storage WHERE key = $1;', ['internalActivities']);
  const internalActivities = parseJsonArray(intRows.length ? intRows[0].value : null);
  return { users, accounts, activities, internalActivities };
}

function buildSummary(results) {
  const summary = {
    totalRows: 0,
    externalCount: 0,
    internalCount: 0,
    readyCount: 0,
    errorCount: 0,
    duplicateCount: 0,
    needsMappingCount: 0
  };
  for (const r of results) {
    summary.totalRows++;
    if (r.category === 'external') summary.externalCount++;
    if (r.category === 'internal') summary.internalCount++;
    if (r.status === 'ready') summary.readyCount++;
    if (r.status === 'error') summary.errorCount++;
    if (r.duplicate) summary.duplicateCount++;
    if (r.status === 'needs_mapping') summary.needsMappingCount++;
  }
  return summary;
}

/**
 * @param {object} body - { rows | csv, categoryHint? }
 * @param {{ apiMode?: boolean }} opts
 */
async function dryRun(body, opts = {}) {
  const { rows, categoryHint, fromJsonRows } = rowsFromPayload(body);
  if (rows.length > MAX_ROWS) {
    const err = new Error(`At most ${MAX_ROWS} rows per request.`);
    err.code = 'ROW_LIMIT';
    throw err;
  }
  const pool = getPool();
  const { users, accounts, activities } = await loadContext(pool);
  const duplicateHash = new Set();
  const results = [];
  const apiMode = opts.apiMode !== false;

  for (let i = 0; i < rows.length; i++) {
    const row = normalizeRowForEval(rows[i], fromJsonRows);
    const displayRowNumber = i + 2;
    results.push(
      evaluateRow(row, displayRowNumber, users, accounts, activities, duplicateHash, categoryHint, apiMode)
    );
  }

  const errors = results
    .filter((r) => r.status === 'error')
    .map((r) => ({
      row: r.index,
      field: null,
      message: (r.errors && r.errors.length ? r.errors : r.messages).join('; ')
    }));

  return {
    ok: true,
    summary: buildSummary(results),
    rowResults: results.map((r) => ({
      row: r.index,
      status: r.status,
      category: r.category,
      duplicate: !!r.duplicate,
      messages: r.messages
    })),
    errors
  };
}

async function readIdempotencyMap(pool) {
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1;', [IDEMPOTENCY_KEY]);
  if (!rows.length || rows[0].value == null) return {};
  try {
    const raw = maybeDecompressValue(rows[0].value);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

async function writeIdempotencyMap(client, map) {
  const serialized = JSON.stringify(map);
  await archiveCurrentValue(client, IDEMPOTENCY_KEY);
  await client.query(
    `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW();`,
    [IDEMPOTENCY_KEY, serialized]
  );
  storageRouter.invalidateStorageReadCache(IDEMPOTENCY_KEY);
}

async function writeAccountsInTx(client, accountsArr) {
  const v = validateAccounts(accountsArr);
  if (!v.valid) {
    const e = new Error(v.error || 'accounts validation failed');
    e.code = 'VALIDATION';
    throw e;
  }
  const serialized = JSON.stringify(accountsArr);
  await archiveCurrentValue(client, 'accounts');
  await client.query(
    `INSERT INTO storage (key, value, updated_at) VALUES ('accounts', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW();`,
    [serialized]
  );
  storageRouter.invalidateStorageReadCache('accounts');
}

function toIsoDate(d) {
  if (d == null || d === '') return new Date().toISOString();
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return String(d);
  return parsed.toISOString();
}

function buildExternalActivity(payload, stableActivityId) {
  const activity = {
    id: stableActivityId,
    userId: payload.user.id,
    userName: payload.user.username,
    accountId: null,
    accountName: null,
    projectId: null,
    projectName: null,
    date: toIsoDate(payload.date),
    type: payload.activityType,
    salesRep: payload.salesRepName || '',
    industry: payload.industry || '',
    details: {},
    source: 'super_agent',
    isMigrated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (payload.activityType === 'customerCall') {
    activity.details = {
      callType: payload.callType || '',
      description: payload.description || ''
    };
  } else if (payload.activityType === 'sow') {
    activity.details = { sowLink: payload.sowLink || '' };
  } else if (payload.activityType === 'poc') {
    activity.details = {
      accessType: payload.pocAccessType || '',
      useCaseDescription: payload.pocUseCaseDescription || '',
      startDate: payload.pocSandboxStartDate || '',
      endDate: payload.pocSandboxEndDate || '',
      demoEnvironment: payload.pocDemoEnvironment || '',
      botTriggerUrl: payload.pocBotTriggerUrl || ''
    };
  } else if (payload.activityType === 'rfx') {
    activity.details = {
      rfxType: payload.rfxType || '',
      submissionDeadline: payload.rfxDeadline || '',
      googleFolderLink: payload.rfxFolderLink || '',
      notes: payload.rfxNotes || ''
    };
  } else if (payload.activityType === 'pricing') {
    activity.details = {};
  }

  return activity;
}

function buildInternalActivity(payload, stableActivityId) {
  const timeSpent =
    payload.timeSpentType && payload.timeSpentValue
      ? `${payload.timeSpentValue} ${payload.timeSpentType === 'day' ? 'day(s)' : 'hour(s)'}`
      : null;
  return {
    id: stableActivityId,
    userId: payload.user.id,
    userName: payload.user.username,
    date: toIsoDate(payload.date),
    type: payload.activityType,
    timeSpent,
    activityName: payload.activityName || '',
    topic: payload.topic || '',
    description: payload.description || '',
    isInternal: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * @param {string} batchId
 * @param {object} body - same as dryRun
 */
async function commit(batchId, body) {
  if (!batchId || !BATCH_ID_RE.test(batchId)) {
    const e = new Error('batch_id must match /^[a-zA-Z0-9:_.-]{1,120}$/');
    e.code = 'BAD_BATCH_ID';
    throw e;
  }

  const pool = getPool();
  const existingMap = await readIdempotencyMap(pool);
  if (existingMap[batchId]) {
    return { ...existingMap[batchId], ok: true, idempotent: true };
  }

  const { rows, categoryHint, fromJsonRows } = rowsFromPayload(body);
  const { users, accounts: accountsInitial, activities: activitiesInitial } = await loadContext(pool);
  const duplicateHash = new Set();
  const fullResults = [];
  for (let i = 0; i < rows.length; i++) {
    const row = normalizeRowForEval(rows[i], fromJsonRows);
    fullResults.push(
      evaluateRow(row, i + 2, users, accountsInitial, activitiesInitial, duplicateHash, categoryHint, true)
    );
  }

  const readyRows = fullResults.filter((r) => r.status === 'ready' && !r.duplicate);
  if (!readyRows.length) {
    const e = new Error('No rows ready to commit (all errors, duplicates, or blocked).');
    e.code = 'NOTHING_TO_COMMIT';
    e.summary = buildSummary(fullResults);
    throw e;
  }

  let accounts = JSON.parse(JSON.stringify(accountsInitial));
  const activityIds = [];
  let externalCount = 0;
  let internalCount = 0;
  let createdAccounts = 0;
  let createdProjects = 0;

  const runOneRowTx = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      throw err;
    } finally {
      client.release();
    }
  };

  let commitIdx = 0;
  for (const row of readyRows) {
    const stableId = `sa:${batchId}:${commitIdx}`;
    commitIdx++;

    if (row.category === 'internal') {
      const p = row.payload;
      const act = buildInternalActivity(p, stableId);
      const result = await runOneRowTx((client) => storageRouter.appendInternalActivityWithClient(client, act));
      if (!result.ok && result.validationError) {
        const e = new Error(result.validationError);
        e.code = 'ACTIVITY_VALIDATION';
        throw e;
      }
      if (!result.ok && result.dropped) {
        const e = new Error('Internal activity append dropped');
        e.code = 'APPEND_FAILED';
        throw e;
      }
      if (result.mergedArray) {
        await dualWriteAfterStorageWrite(pool, 'internalActivities', result.mergedArray);
      }
      activityIds.push(stableId);
      internalCount++;
      continue;
    }

    const payload = row.payload;
    let account = findAccount(accounts, payload.accountName);
    if (!account) {
      account = {
        id: generateId(),
        name: payload.accountName,
        industry: payload.industry || '',
        salesRep: payload.salesRepName || '',
        salesRepEmail: payload.salesRepEmail || '',
        salesRepRegion: '',
        projects: [],
        createdAt: new Date().toISOString()
      };
      accounts.push(account);
      createdAccounts++;
    } else {
      if (payload.industry && payload.industry !== account.industry) {
        account.industry = payload.industry;
      }
      if (payload.salesRepName && payload.salesRepName !== account.salesRep) {
        account.salesRep = payload.salesRepName;
      }
    }

    let project = findProject(account, payload.projectName);
    if (!project) {
      project = {
        id: generateId(),
        name: payload.projectName,
        sfdcLink: payload.sfdcLink || '',
        useCases: normalizeMultiValues(payload.useCases, payload.useCaseOther),
        productsInterested: normalizeMultiValues(payload.products, payload.productsOther),
        channels: normalizeMultiValues(payload.channels, payload.channelsOther),
        activities: [],
        status: 'active',
        createdAt: new Date().toISOString()
      };
      if (!Array.isArray(account.projects)) account.projects = [];
      account.projects.push(project);
      createdProjects++;
    } else {
      if (payload.sfdcLink) project.sfdcLink = payload.sfdcLink;
      if (payload.useCases.length || payload.useCaseOther) {
        project.useCases = normalizeMultiValues(payload.useCases, payload.useCaseOther);
      }
      if (payload.products.length || payload.productsOther) {
        project.productsInterested = normalizeMultiValues(payload.products, payload.productsOther);
      }
      if (payload.channels.length || payload.channelsOther) {
        project.channels = normalizeMultiValues(payload.channels, payload.channelsOther);
      }
    }

    await runOneRowTx(async (client) => {
      await writeAccountsInTx(client, accounts);
    });
    await dualWriteAfterStorageWrite(pool, 'accounts', accounts);

    const activity = buildExternalActivity(payload, stableId);
    activity.accountId = account.id;
    activity.accountName = account.name;
    activity.projectId = project.id;
    activity.projectName = project.name;
    activity.salesRep = payload.salesRepName || account.salesRep || '';

    const appendResult = await runOneRowTx((client) => storageRouter.appendActivityWithClient(client, activity));
    if (!appendResult.ok && appendResult.validationError) {
      const e = new Error(appendResult.validationError);
      e.code = 'ACTIVITY_VALIDATION';
      throw e;
    }
    if (!appendResult.ok && appendResult.dropped) {
      const e = new Error('Activity append dropped');
      e.code = 'APPEND_FAILED';
      throw e;
    }
    if (appendResult.mergedArray) {
      await dualWriteAfterStorageWrite(pool, 'activities', appendResult.mergedArray);
    }

    const accountRef = accounts.find((a) => a.id === account.id);
    if (accountRef && accountRef.projects) {
      const projectRef = accountRef.projects.find((pr) => pr.id === project.id);
      if (projectRef) {
        if (!Array.isArray(projectRef.activities)) projectRef.activities = [];
        projectRef.activities.push(activity);
        await runOneRowTx(async (client) => {
          await writeAccountsInTx(client, accounts);
        });
        await dualWriteAfterStorageWrite(pool, 'accounts', accounts);
      }
    }

    activityIds.push(stableId);
    externalCount++;
  }

  const resultPayload = {
    ok: true,
    idempotent: false,
    batch_id: batchId,
    externalCount,
    internalCount,
    createdAccounts,
    createdProjects,
    activityIds,
    summary: buildSummary(fullResults)
  };

  const map = { ...existingMap, [batchId]: resultPayload };
  const mapKeys = Object.keys(map);
  if (mapKeys.length > 500) {
    mapKeys.sort();
    for (let i = 0; i < mapKeys.length - 500; i++) {
      delete map[mapKeys[i]];
    }
  }

  const idemClient = await pool.connect();
  try {
    await idemClient.query('BEGIN');
    await writeIdempotencyMap(idemClient, map);
    await idemClient.query('COMMIT');
  } catch (err) {
    try {
      await idemClient.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    throw err;
  } finally {
    idemClient.release();
  }

  logger.info('super_agent_import_commit', {
    batch_id: batchId,
    externalCount,
    internalCount,
    createdAccounts,
    createdProjects
  });
  return resultPayload;
}

module.exports = {
  dryRun,
  commit,
  MAX_ROWS,
  rowsFromPayload,
  parseCsv,
  evaluateRow,
  BATCH_ID_RE
};
