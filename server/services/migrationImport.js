/**
 * Migration CSV import: parse pams_migration_ready_v3.csv, filter by date <= Jan 2026,
 * build draft accounts (with nested projects), activities by month, internal activities.
 * Industry: set only for external accounts; internal activities have no industry (ignored).
 */

const zlib = require('zlib');
const { getPool } = require('../db');
const logger = require('../logger');

const GZIP_PREFIX = '__gz__';
function compressForStorage(str) {
  const buf = Buffer.from(str, 'utf8');
  const compressed = zlib.gzipSync(buf);
  return GZIP_PREFIX + compressed.toString('base64');
}

const MIGRATION_CUTOFF = '2026-01-31'; // only rows with activity date <= this
const CANONICAL_INDUSTRIES = [
  'Banking', 'Fintech', 'Insurance', 'Retail / eCommerce', 'Healthcare',
  'B2B / Manufacturing', 'Automotive', 'Real Estate', 'Hospitality',
  'Transportation', 'Sports', 'Gov / Citizen Services', 'Education',
  'Media & Entertainment', 'IT & Software', 'CPG & FMCG', 'Pharma & Life Sciences',
  'Logistics & Supply Chain', 'Industrial', 'Agritech', 'Professional Services'
];

const INDUSTRY_MAP = {
  'bfsi': 'Banking', 'banking': 'Banking',
  'financial services': 'Fintech', 'fintech': 'Fintech',
  'insurance': 'Insurance',
  'retail & ecommerce': 'Retail / eCommerce', 'retail / ecommerce': 'Retail / eCommerce', 'retail': 'Retail / eCommerce',
  'healthcare': 'Healthcare',
  'b2b / manufacturing': 'B2B / Manufacturing',
  'automotive': 'Automotive', 'automative': 'Automotive',
  'real estate': 'Real Estate',
  'hospitality': 'Hospitality', 'travel & hospitality': 'Hospitality', 'travel and hospitality': 'Hospitality',
  'transportation': 'Transportation',
  'sports': 'Sports',
  'gov / citizen services': 'Gov / Citizen Services', 'government': 'Gov / Citizen Services', 'goverment': 'Gov / Citizen Services',
  'education': 'Education',
  'media': 'Media & Entertainment', 'media & entertainment': 'Media & Entertainment',
  'it & software': 'IT & Software',
  'f&b': 'CPG & FMCG', 'cpg & fmcg': 'CPG & FMCG',
  'utility : energy, gas': 'Industrial', 'industrial': 'Industrial',
  'logistics': 'Logistics & Supply Chain', 'logistics & supply chain': 'Logistics & Supply Chain',
  'pharma': 'Pharma & Life Sciences', 'pharma & life sciences': 'Pharma & Life Sciences',
  'agritech': 'Agritech',
  'professional services': 'Professional Services', 'consulting': 'Professional Services'
};

const ACTIVITY_TYPE_MAP = {
  'customer calls': 'customerCall',
  'poc': 'poc',
  'sow': 'sow',
  'demo': 'demo',
  'discovery': 'discovery',
  'scoping / sow': 'sow',
  'other': 'other'
};

// Vague account names: treat as internal (no external account/activity)
const VAGUE_PATTERNS = [
  /^webinar$/i, /^person\s+name$/i, /^n\/?a$/i, /^na$/i, /^tbd$/i, /^tba$/i,
  /^internal$/i, /^general$/i, /^misc$/i, /^unknown$/i, /^none$/i,
  /^$/
];

function isVagueAccountName(name) {
  if (!name || typeof name !== 'string') return true;
  const t = name.trim();
  if (t.length < 2) return true;
  return VAGUE_PATTERNS.some(p => p.test(t));
}

function mapToCanonicalIndustry(source) {
  if (!source || typeof source !== 'string') return null;
  const lower = source.trim().toLowerCase();
  return INDUSTRY_MAP[lower] || (CANONICAL_INDUSTRIES.includes(source.trim()) ? source.trim() : null);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
      result.push(current.trim());
      current = '';
      if (c === '\n') break;
    } else {
      current += c;
    }
  }
  if (current.length) result.push(current.trim());
  return result;
}

/** Parse date: CSV may be DD-MM-YYYY or MM-DD-YY. Return YYYY-MM-DD or null. */
function parseActivityDate(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const parts = trimmed.split(/[-/.]/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  let year, month, day;
  if (parts[2].length === 4) {
    // DD-MM-YYYY or MM-DD-YYYY
    const y = parseInt(parts[2], 10);
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    if (a > 12) {
      day = a; month = b; year = y;
    } else if (b > 12) {
      month = a; day = b; year = y;
    } else {
      day = a; month = b; year = y;
    }
  } else {
    const yy = parseInt(parts[2], 10);
    year = yy < 50 ? 2000 + yy : 1900 + yy;
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    if (a > 12) {
      day = a; month = b;
    } else {
      month = a; day = b;
    }
  }
  if (!year || !month || !day) return null;
  const m = month < 10 ? '0' + month : String(month);
  const d = day < 10 ? '0' + day : String(day);
  return `${year}-${m}-${d}`;
}

function generateId() {
  if (typeof require('crypto').randomUUID === 'function') {
    return require('crypto').randomUUID();
  }
  return 'mig-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
}

function normalizeActivityType(type) {
  if (!type || typeof type !== 'string') return 'other';
  const t = type.trim().toLowerCase();
  return ACTIVITY_TYPE_MAP[t] || (t.replace(/\s+/g, '') || 'other');
}

/**
 * @param {string} csvContent - raw CSV string
 * @returns {{ accounts: Array, activitiesByMonth: Record<string, Array>, internalActivities: Array, errors: Array }}
 */
function parseMigrationCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return { accounts: [], activitiesByMonth: {}, internalActivities: [], errors: ['CSV has no data rows'] };
  }

  const header = parseCSVLine(lines[0]);
  const getIdx = (name) => {
    const i = header.findIndex(h => (h || '').toLowerCase().trim() === name.toLowerCase().trim());
    return i >= 0 ? i : -1;
  };
  const idx = {
    category: getIdx('Activity Category'),
    date: getIdx('Date'),
    presalesUsername: getIdx('Presales Username'),
    activityType: getIdx('Activity Type'),
    accountName: getIdx('Account Name'),
    projectName: getIdx('Project Name'),
    salesRepName: getIdx('Sales Rep Name'),
    industry: getIdx('Industry'),
    sfdcLink: getIdx('SFDC Link'),
    products: getIdx('Products'),
    channels: getIdx('Channels'),
    callType: getIdx('Call Type'),
    description: getIdx('Description'),
    timeSpentType: getIdx('Time Spent Type'),
    timeSpentValue: getIdx('Time Spent Value'),
    internalActivityName: getIdx('Internal Activity Name'),
    internalTopic: getIdx('Internal Topic'),
    internalDescription: getIdx('Internal Description')
  };

  if (idx.accountName === -1 || idx.date === -1) {
    return { accounts: [], activitiesByMonth: {}, internalActivities: [], errors: ['CSV missing required columns (Date, Account Name)'] };
  }

  const cutoff = MIGRATION_CUTOFF;
  const accountByName = new Map(); // name -> { id, name, industry (suggested), salesRep, projects: Map(projectKey -> project) }
  const activitiesByMonth = {};
  const internalActivities = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const get = (key) => (fields[idx[key]] || '').trim();
    const category = (get('category') || 'external').toLowerCase();
    const accountName = get('accountName');
    const dateStr = parseActivityDate(get('date'));
    if (!dateStr || dateStr > cutoff) continue;

    const month = dateStr.slice(0, 7);
    const isInternal = category === 'internal' || isVagueAccountName(accountName);

    if (isInternal) {
      const internalId = generateId();
      const timeSpent = [get('timeSpentValue'), get('timeSpentType')].filter(Boolean).join(' ') || undefined;
      internalActivities.push({
        id: internalId,
        userId: null,
        userName: get('presalesUsername') || null,
        date: dateStr,
        type: get('activityType') || 'Internal',
        timeSpent: timeSpent || undefined,
        activityName: get('internalActivityName') || accountName || (get('description') || '').slice(0, 200),
        topic: get('internalTopic') || undefined,
        description: get('internalDescription') || get('description') || undefined,
        isInternal: true,
        details: {},
        _migrationDraft: true,
        _migrationRowIndex: i + 1
      });
      continue;
    }

    const accountId = accountByName.has(accountName)
      ? accountByName.get(accountName).id
      : generateId();
    if (!accountByName.has(accountName)) {
      const suggestedIndustry = mapToCanonicalIndustry(get('industry'));
      accountByName.set(accountName, {
        id: accountId,
        name: accountName,
        industry: suggestedIndustry || undefined,
        salesRep: get('salesRepName') || undefined,
        salesRepEmail: undefined,
        salesRepRegion: undefined,
        projects: new Map(),
        _migrationDraft: true
      });
    }

    const acc = accountByName.get(accountName);
    const projectName = get('projectName') || 'General';
    const projectKey = projectName.trim().toLowerCase();
    let project = acc.projects.get(projectKey);
    if (!project) {
      const projectId = generateId();
      project = {
        id: projectId,
        name: projectName,
        useCases: projectName.includes(',') ? projectName.split(',').map(s => s.trim()).filter(Boolean) : [projectName.trim()],
        sfdcLink: get('sfdcLink') || undefined,
        productsInterested: get('products') ? get('products').split('|').map(s => s.trim()).filter(Boolean) : undefined
      };
      acc.projects.set(projectKey, project);
    }

    if (!activitiesByMonth[month]) activitiesByMonth[month] = [];
    const activityId = generateId();
    activitiesByMonth[month].push({
      id: activityId,
      accountId: acc.id,
      accountName: acc.name,
      projectId: project.id,
      projectName: project.name,
      date: dateStr,
      monthOfActivity: month,
      type: normalizeActivityType(get('activityType')),
      summary: get('description') || undefined,
      assignedUserEmail: get('presalesUsername') || undefined,
      salesRep: get('salesRepName') || undefined,
      source: 'migration',
      _migrationDraft: true,
      _migrationRowIndex: i + 1
    });
  }

  const accounts = Array.from(accountByName.values()).map(acc => ({
    ...acc,
    projects: Array.from(acc.projects.values())
  })).map(({ projects, ...a }) => ({ ...a, projects }));

  return {
    accounts,
    activitiesByMonth,
    internalActivities,
    errors
  };
}

async function writeDraftToStorage(accounts, activitiesByMonth, internalActivities) {
  const pool = getPool();
  const write = async (key, value) => {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const stored = compressForStorage(serialized);
    await pool.query(
      `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW();`,
      [key, stored]
    );
  };

  await write('migration_draft_accounts', accounts);
  for (const [month, list] of Object.entries(activitiesByMonth)) {
    await write(`migration_draft_activities:${month}`, list);
  }
  await write('migration_draft_internalActivities', internalActivities);
  await write('migration_draft_meta', {
    importedAt: new Date().toISOString(),
    accountCount: accounts.length,
    activityMonths: Object.keys(activitiesByMonth),
    internalCount: internalActivities.length
  });
}

module.exports = {
  parseMigrationCSV,
  writeDraftToStorage,
  MIGRATION_CUTOFF,
  CANONICAL_INDUSTRIES
};
