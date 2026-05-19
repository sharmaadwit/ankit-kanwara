const fs = require('fs');
const path = require('path');
const { loadActivitiesAndUsers } = require('./storageDataLoad');

/** Default annual window: 1 July (prior year if before July) through today (UTC date). */
const defaultAnnualFromDate = (now = new Date()) => {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const startYear = m >= 7 ? y : y - 1;
  return `${startYear}-07-01`;
};

const defaultAnnualToDate = (now = new Date()) => now.toISOString().slice(0, 10);

const parseYmd = (s) => {
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  const [y, mo, d] = s.trim().split('-').map(Number);
  return Date.UTC(y, mo - 1, d);
};

const resolveActivityDateYmd = (activity) => {
  if (!activity) return null;
  const isMigrated = activity.source === 'migration' || activity.isMigrated === true;
  if (isMigrated && activity.monthOfActivity && /^\d{4}-\d{2}$/.test(String(activity.monthOfActivity))) {
    return `${activity.monthOfActivity}-01`;
  }
  const raw = activity.activityDate ?? activity.date ?? activity.createdAt ?? activity.monthOfActivity;
  if (raw == null || raw === '') return null;
  const s = typeof raw === 'string' ? raw : (raw.toISOString && raw.toISOString()) || '';
  if (s.length >= 10) return s.slice(0, 10);
  if (s.length >= 7) return `${s.slice(0, 7)}-01`;
  return null;
};

const resolveActivityMonth = (activity) => {
  const ymd = resolveActivityDateYmd(activity);
  return ymd ? ymd.slice(0, 7) : null;
};

const normExternalType = (activity) => {
  if (!activity || activity.isInternal === true) return 'internal';
  const raw =
    activity.type != null && activity.type !== ''
      ? String(activity.type).trim().toLowerCase().replace(/\s+/g, ' ')
      : '';
  if (!raw) return 'other';
  if (raw === 'customercall' || raw === 'customer_call' || raw === 'customer-call' || raw === 'customer call') {
    return 'customerCall';
  }
  if (['pricing', 'poc', 'sow', 'rfx'].includes(raw)) return raw;
  return 'other';
};

const userLabelFromActivity = (activity) => {
  const raw = activity.userName || activity.assignedUserEmail || '';
  const part = String(raw)
    .split(/[/|,]+/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return part || 'Unassigned';
};

const userLabelFromRecord = (user) => {
  if (!user) return null;
  const name = user.name != null && String(user.name).trim() ? String(user.name).trim() : '';
  if (name) return name;
  const un = user.username != null && String(user.username).trim() ? String(user.username).trim() : '';
  return un || null;
};

const emptyUserSummary = (label) => ({
  user: label,
  totalActivities: 0,
  internal: 0,
  external: 0,
  customerCall: 0,
  sow: 0,
  poc: 0,
  rfx: 0,
  pricing: 0,
  other: 0,
  firstActivityDate: null,
  lastActivityDate: null
});

const csvEscape = (value) => {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const rowsToCsv = (headers, rows) => {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  });
  return lines.join('\r\n');
};

const buildAnnualUserActivityExport = ({
  activities,
  users,
  fromDate,
  toDate,
  source,
  fetchedAt
}) => {
  const fromMs = parseYmd(fromDate);
  const toMs = parseYmd(toDate);
  if (fromMs == null || toMs == null) {
    throw new Error('fromDate and toDate must be YYYY-MM-DD');
  }

  const filtered = (activities || []).filter((activity) => {
    const ymd = resolveActivityDateYmd(activity);
    if (!ymd) return false;
    const ms = parseYmd(ymd);
    return ms != null && ms >= fromMs && ms <= toMs;
  });

  const summaryMap = new Map();
  (users || []).forEach((user) => {
    const label = userLabelFromRecord(user);
    if (label && !summaryMap.has(label)) summaryMap.set(label, emptyUserSummary(label));
  });

  const detailRows = filtered.map((activity) => {
    const user = userLabelFromActivity(activity);
    const ymd = resolveActivityDateYmd(activity);
    const bucket = normExternalType(activity);
    if (!summaryMap.has(user)) summaryMap.set(user, emptyUserSummary(user));
    const sum = summaryMap.get(user);
    sum.totalActivities++;
    if (bucket === 'internal') sum.internal++;
    else {
      sum.external++;
      if (sum[bucket] != null) sum[bucket]++;
      else sum.other++;
    }
    if (!sum.firstActivityDate || ymd < sum.firstActivityDate) sum.firstActivityDate = ymd;
    if (!sum.lastActivityDate || ymd > sum.lastActivityDate) sum.lastActivityDate = ymd;

    const callType =
      activity.details && activity.details.callType ? String(activity.details.callType) : '';
    return {
      activityId: activity.id,
      activityDate: ymd,
      month: resolveActivityMonth(activity),
      user,
      isInternal: activity.isInternal === true ? 'yes' : 'no',
      type: activity.type || '',
      callType,
      accountName: activity.accountName || '',
      accountId: activity.accountId || '',
      salesRep: activity.salesRep || '',
      region: activity.salesRepRegion || activity.region || '',
      durationHours: activity.durationHours != null ? activity.durationHours : '',
      projectId: activity.projectId || ''
    };
  });

  const summaryByUser = Array.from(summaryMap.values()).sort(
    (a, b) => b.totalActivities - a.totalActivities || a.user.localeCompare(b.user)
  );

  return {
    meta: {
      title: 'Annual user activity export',
      fromDate,
      toDate,
      source: source || null,
      fetchedAt: fetchedAt || new Date().toISOString(),
      totalActivitiesInRange: filtered.length,
      userCount: summaryByUser.length
    },
    summaryByUser,
    activities: detailRows
  };
};

const loadAndBuildAnnualExport = async (options = {}) => {
  const fromDate = options.fromDate || process.env.ANNUAL_EXPORT_FROM || defaultAnnualFromDate();
  const toDate = options.toDate || process.env.ANNUAL_EXPORT_TO || defaultAnnualToDate();
  const loaded = await loadActivitiesAndUsers(options);
  const payload = buildAnnualUserActivityExport({
    activities: loaded.activities,
    users: loaded.users,
    fromDate,
    toDate,
    source: loaded.source,
    fetchedAt: loaded.fetchedAt
  });
  return payload;
};

const writeAnnualExportFiles = (payload, outputDir) => {
  const dir = path.resolve(outputDir || path.join(process.cwd(), 'exports'));
  fs.mkdirSync(dir, { recursive: true });
  const slug = `${payload.meta.fromDate}_to_${payload.meta.toDate}`.replace(/[^\d_-]/g, '');
  const jsonPath = path.join(dir, `annual-user-activity-${slug}.json`);
  const summaryCsvPath = path.join(dir, `annual-user-activity-summary-${slug}.csv`);
  const detailCsvPath = path.join(dir, `annual-user-activity-detail-${slug}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  const summaryHeaders = [
    'user',
    'totalActivities',
    'internal',
    'external',
    'customerCall',
    'sow',
    'poc',
    'rfx',
    'pricing',
    'other',
    'firstActivityDate',
    'lastActivityDate'
  ];
  fs.writeFileSync(
    summaryCsvPath,
    rowsToCsv(summaryHeaders, payload.summaryByUser),
    'utf8'
  );

  const detailHeaders = [
    'activityId',
    'activityDate',
    'month',
    'user',
    'isInternal',
    'type',
    'callType',
    'accountName',
    'accountId',
    'salesRep',
    'region',
    'durationHours',
    'projectId'
  ];
  fs.writeFileSync(detailCsvPath, rowsToCsv(detailHeaders, payload.activities), 'utf8');

  return { jsonPath, summaryCsvPath, detailCsvPath, outputDir: dir };
};

module.exports = {
  defaultAnnualFromDate,
  defaultAnnualToDate,
  buildAnnualUserActivityExport,
  loadAndBuildAnnualExport,
  writeAnnualExportFiles,
  rowsToCsv
};
