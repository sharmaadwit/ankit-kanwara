/**
 * Pushes the cleaned migration snapshot to the hosted Railway environment.
 *
 * Usage:
 *   node server/scripts/push-migration-to-railway.js
 */

const fs = require('fs');
const path = require('path');

const RAILWAY_BASE_URL =
  process.env.RAILWAY_APP_URL ||
  'https://ankit-kanwara-production.up.railway.app';
const SNAPSHOT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'pams-app',
  'data',
  'importedData.snapshot.json'
);
const HEADERS = {
  'x-admin-user': process.env.RAILWAY_STORAGE_USER || 'migration-script'
};

const VERSION =
  process.env.MIGRATION_VERSION || new Date().toISOString();

const DEFAULT_USERS = [
  {
    id: 'admin-default',
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    roles: ['Admin', 'Presales User', 'Analytics Access'],
    regions: ['India South', 'India North'],
    salesReps: ['John Doe', 'Jane Smith'],
    defaultRegion: 'India South',
    isActive: true,
    createdAt: new Date().toISOString(),
    forcePasswordChange: false,
    passwordUpdatedAt: new Date().toISOString()
  },
  {
    id: 'user-default',
    username: 'user',
    email: 'user@example.com',
    password: 'user123',
    roles: ['Presales User'],
    regions: ['India South'],
    salesReps: ['John Doe'],
    defaultRegion: 'India South',
    isActive: true,
    createdAt: new Date().toISOString(),
    forcePasswordChange: false,
    passwordUpdatedAt: new Date().toISOString()
  }
];

const generateId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

const fetchJson = async (suffix) => {
  const response = await fetch(`${RAILWAY_BASE_URL}${suffix}`, {
    headers: HEADERS
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText} (${suffix})`
    );
  }
  return response.json();
};

const loadKey = async (key) => {
  const payload = await fetchJson(`/api/storage/${encodeURIComponent(key)}`);
  if (!payload || typeof payload.value !== 'string') {
    return null;
  }
  try {
    return JSON.parse(payload.value);
  } catch (error) {
    return null;
  }
};

const saveKey = async (key, value) => {
  const url = `${RAILWAY_BASE_URL}/api/storage/${encodeURIComponent(key)}`;
  const payload = {
    value: JSON.stringify(value)
  };
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to save key "${key}": ${response.status} ${response.statusText} -> ${text}`
    );
  }
};

const ensureDefaultUsers = (existing = []) => {
  if (!Array.isArray(existing) || !existing.length) {
    return [...DEFAULT_USERS];
  }
  const emails = new Set(
    existing
      .map((user) => (user.email || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const merged = [...existing];
  DEFAULT_USERS.forEach((user) => {
    const email = (user.email || '').trim().toLowerCase();
    if (email && !emails.has(email)) {
      merged.push({ ...user });
      emails.add(email);
    }
  });
  return merged;
};

const buildResolvers = (users) => {
  const byEmail = new Map();
  const byUsername = new Map();

  users.forEach((user) => {
    if (user.email) {
      byEmail.set(user.email.trim().toLowerCase(), user);
    }
    if (user.username) {
      byUsername.set(user.username.trim().toLowerCase(), user);
    }
  });

  const resolveUser = (record) => {
    const rawEmail = record.assignedUserEmail || record.raw?.email || '';
    const email =
      typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (email && byEmail.has(email)) {
      return byEmail.get(email);
    }
    const baseName =
      record.assignedUserName ||
      (email ? email.split('@')[0] : 'user');
    const username = baseName.replace(/\s+/g, '.').toLowerCase();
    const newUser = {
      id: generateId(),
      username,
      name: baseName,
      email,
      password: 'Welcome@123',
      roles: ['Presales User'],
      regions: [],
      salesReps: [],
      defaultRegion: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      forcePasswordChange: true,
      passwordUpdatedAt: null
    };
    byUsername.set(username, newUser);
    if (email) {
      byEmail.set(email, newUser);
    }
    users.push(newUser);
    return newUser;
  };

  return { resolveUser };
};

const toMonthIso = (month) => {
  if (!month) return '';
  const parts = String(month).split('-');
  if (parts.length !== 2) {
    return '';
  }
  const [year, mm] = parts;
  if (!year || !mm) {
    return '';
  }
  return `${year}-${mm.padStart(2, '0')}-01T00:00:00.000Z`;
};

const resolveDate = (record) => {
  if (record.activityDate) {
    return record.activityDate;
  }
  if (record.monthOfActivity) {
    const monthIso = toMonthIso(record.monthOfActivity);
    if (monthIso) {
      return monthIso;
    }
  }
  const rawTimestamp = record.raw?.timestamp;
  if (rawTimestamp) {
    const parsed = new Date(rawTimestamp);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (record.createdAt) {
    return record.createdAt;
  }
  return new Date().toISOString();
};

const normalizeType = (value) => {
  const token = (value || '').toLowerCase();
  if (token.includes('poc')) return 'poc';
  if (token.includes('rfx') || token.includes('rfp')) return 'rfx';
  if (token.includes('sow')) return 'sow';
  if (token.includes('pricing')) return 'pricing';
  if (token.includes('call')) return 'customerCall';
  return 'customerCall';
};

const buildDetails = (type, record) => {
  const description =
    record.activitySummary ||
    record.raw?.description ||
    record.raw?.internalDescription ||
    '';
  switch (type) {
    case 'customerCall':
      return {
        callType: record.raw?.callType || '',
        description
      };
    case 'poc':
      return {
        accessType: record.accessType || record.raw?.accessType || '',
        useCaseDescription: description,
        startDate: record.raw?.startDate || '',
        endDate: record.raw?.endDate || ''
      };
    case 'rfx':
      return {
        rfxType: record.raw?.rfxType || '',
        submissionDeadline: record.raw?.potentialCloseDate || '',
        notes: description
      };
    case 'sow':
      return {
        sowLink: record.raw?.sowLink || record.sfdcLink || '',
        notes: description
      };
    default:
      return { description };
  }
};

const isInternalRecord = (record) => {
  if (record.isInternalCandidate) return true;
  const category = (record.raw?.activityCategory || '').toLowerCase();
  if (category === 'internal') return true;
  const salesOwner = (record.salesRep || '').trim().toLowerCase();
  return salesOwner === 'na' || salesOwner === 'internal';
};

const ensureAccount = (accounts, accountMap, record) => {
  const name =
    record.accountName && record.accountName.trim()
      ? record.accountName.trim()
      : 'Unassigned Account';
  const key = name.toLowerCase();
  if (accountMap.has(key)) {
    return accountMap.get(key);
  }
  const account = {
    id: generateId(),
    name,
    industry: record.raw?.industry || '',
    salesRep: record.salesRep || '',
    salesRepEmail: record.salesRepEmail || '',
    salesRepRegion: record.salesRepRegion || '',
    projects: [],
    createdAt: new Date().toISOString()
  };
  accounts.push(account);
  accountMap.set(key, account);
  return account;
};

const ensureProject = (account, projectMap, record) => {
  const name =
    (record.projectName && record.projectName.trim()) || account.name;
  const key = `${account.id}::${name.toLowerCase()}`;
  if (projectMap.has(key)) {
    return projectMap.get(key);
  }
  const project = {
    id: generateId(),
    name,
    sfdcLink: record.sfdcLink || '',
    stage: record.raw?.currentStatus || '',
    status: 'active',
    activities: [],
    createdAt: new Date().toISOString()
  };
  account.projects.push(project);
  projectMap.set(key, project);
  return project;
};

const addActivityToProject = (project, activity) => {
  if (!Array.isArray(project.activities)) {
    project.activities = [];
  }
  const exists = project.activities.some(
    (item) => item.migrationSourceId === activity.migrationSourceId
  );
  if (exists) {
    return;
  }
  project.activities.push({
    id: activity.id,
    date: activity.date,
    type: activity.type,
    userId: activity.userId,
    userName: activity.userName,
    summary: activity.summary,
    migrationSourceId: activity.migrationSourceId
  });
};

const main = async () => {
  const snapshotRaw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const records = JSON.parse(snapshotRaw);

  let users = await loadKey('users');
  users = ensureDefaultUsers(users || []);

  const { resolveUser } = buildResolvers(users);

  const accounts = (await loadKey('accounts')) || [];
  const activities = (await loadKey('activities')) || [];
  const internalActivities =
    (await loadKey('internalActivities')) || [];

  const accountMap = new Map(
    accounts.map((account) => [
      (account.name || '').trim().toLowerCase(),
      account
    ])
  );
  const projectMap = new Map();
  accounts.forEach((account) => {
    (account.projects || []).forEach((project) => {
      projectMap.set(
        `${account.id}::${(project.name || '').trim().toLowerCase()}`,
        project
      );
    });
  });

  const existingActivityIds = new Set(
    activities
      .map((activity) => activity.migrationSourceId)
      .filter(Boolean)
  );
  const existingInternalIds = new Set(
    internalActivities
      .map((activity) => activity.migrationSourceId)
      .filter(Boolean)
  );

  let appendedActivities = 0;
  let appendedInternal = 0;

  records.forEach((record) => {
    const sourceId = record.id || `migration-${generateId()}`;
    if (isInternalRecord(record)) {
      if (existingInternalIds.has(sourceId)) {
        return;
      }
      const user = resolveUser(record);
      const date = resolveDate(record);
      const month = record.monthOfActivity || (date ? date.slice(0, 7) : '');
      const internal = {
        id: generateId(),
        migrationSourceId: sourceId,
        userId: user.id,
        userName: user.username || user.name || user.email || 'Unknown',
        date,
        type: record.activityType || 'Internal Activity',
        timeSpent:
          record.raw?.timeSpentType && record.raw?.timeSpentValue
            ? `${record.raw.timeSpentValue} ${record.raw.timeSpentType}`
            : null,
        activityName:
          record.projectName ||
          record.raw?.internalActivityName ||
          'Internal Activity',
        topic: record.raw?.internalTopic || record.activityType || '',
        description:
          record.activitySummary ||
          record.raw?.internalDescription ||
          record.raw?.description ||
          '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isInternal: true,
        assignedUserId: user.id,
        assignedUserName: user.name || user.username || '',
        assignedUserEmail: user.email || '',
        monthOfActivity: month
      };
      internalActivities.push(internal);
      existingInternalIds.add(sourceId);
      appendedInternal += 1;
      return;
    }

    if (existingActivityIds.has(sourceId)) {
      return;
    }

    const user = resolveUser(record);
    const date = resolveDate(record);
    const month = record.monthOfActivity || (date ? date.slice(0, 7) : '');
    const account = ensureAccount(accounts, accountMap, record);
    const project = ensureProject(account, projectMap, record);
    const type = normalizeType(record.activityType);
    const details = buildDetails(type, record);

    const activity = {
      id: generateId(),
      migrationSourceId: sourceId,
      userId: user.id,
      userName: user.username || user.name || user.email || 'Unknown',
      accountId: account.id,
      accountName: account.name,
      projectId: project.id,
      projectName: project.name,
      date,
      type,
      salesRep: record.salesRep || '',
      salesRepEmail: record.salesRepEmail || '',
      salesRepRegion: record.salesRepRegion || '',
      industry: record.raw?.industry || account.industry || '',
      details,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isInternal: false,
      summary: details.description || '',
      monthOfActivity: month,
      assignedUserId: user.id,
      assignedUserName: user.name || user.username || '',
      assignedUserEmail: user.email || ''
    };

    activities.push(activity);
    addActivityToProject(project, activity);
    existingActivityIds.add(sourceId);
    appendedActivities += 1;
  });

  await saveKey('users', users);
  await saveKey('accounts', accounts);
  await saveKey('activities', activities);
  await saveKey('internalActivities', internalActivities);
  await saveKey('importedDataVersion', VERSION);

  console.log(
    `Migration complete. Added ${appendedActivities} activities and ${appendedInternal} internal activities.`
  );
};

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
