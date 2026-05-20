/**
 * Presales user (who logged the activity) → region. NOT field sales rep.
 *
 * Two email columns in data — do not cross-map:
 *   - Presales logger: assignedUserEmail / userName (PreSight Users: Ankit, Kathyayani, …)
 *   - Field sales rep: salesRepEmail / salesRep on account (globalSalesReps) — separate; never used here
 */

const SAATHWIK_EMAIL = 'saathwik.boregowda@gupshup.io';

/** @type {Record<string, { region: string, regions?: string[], note?: string }>} */
const MANUAL_PRESALES_REGION_BY_EMAIL = {
  // India South
  'ankit.kanwara@gupshup.io': { region: 'India South', note: 'Ankit (presales)' },
  'kathyayani.nayak@gupshup.io': { region: 'India South', note: 'Kathyayani' },
  'yashas.reddy@gupshup.io': { region: 'India South', note: 'Yashas' },

  // India North
  'nikhil.sharma@knowlarity.com': { region: 'India North', note: 'Nikhil' },
  'ankit.chaddha@gupshup.io': { region: 'India North', note: 'Ankit Chaddha' },
  'puru.chauhan@knowlarity.com': { region: 'India North', note: 'Puru Chauhan' },
  'nidhi@gupshup.io': { region: 'India North', note: 'Nidhi' },

  // India West
  'mridul.kumawat@gupshup.io': { region: 'India West', note: 'Mridul' },
  'purusottam.singh@gupshup.io': { region: 'India West', note: 'Puru Purshotam' },

  // MENA
  'gargi.upadhyay@gupshup.io': { region: 'MENA', note: 'Gargi' },
  'siddharth.singh@gupshup.io': { region: 'MENA', note: 'Siddharth' },

  // LATAM
  'mauricio.martins@gupshup.io': { region: 'LATAM', note: 'Mauricio' },
  'mariana.ribeiro@gupshup.io': { region: 'LATAM', note: 'Mafe / Mariana' },

  // Africa & Europe + SEA — per-activity split (see resolveLoggerRegion)
  [SAATHWIK_EMAIL]: {
    region: 'Africa & Europe',
    regions: ['Africa & Europe', 'SEA'],
    note: 'Saathwik — split activity counts across both'
  }
};

/** Users to upsert into Postgres `users` (login roster). */
const MANUAL_PRESALES_USERS = [
  { username: 'ankit.kanwara', email: 'ankit.kanwara@gupshup.io', defaultRegion: 'India South' },
  { username: 'kathyayani.nayak', email: 'kathyayani.nayak@gupshup.io', defaultRegion: 'India South' },
  { username: 'yashas.reddy', email: 'yashas.reddy@gupshup.io', defaultRegion: 'India South' },
  { username: 'nikhil.sharma', email: 'nikhil.sharma@knowlarity.com', defaultRegion: 'India North' },
  { username: 'ankit.chaddha', email: 'ankit.chaddha@gupshup.io', defaultRegion: 'India North' },
  { username: 'puru.chauhan', email: 'puru.chauhan@knowlarity.com', defaultRegion: 'India North' },
  { username: 'nidhi', email: 'nidhi@gupshup.io', defaultRegion: 'India North' },
  { username: 'mridul.kumawat', email: 'mridul.kumawat@gupshup.io', defaultRegion: 'India West' },
  { username: 'purusottam.singh', email: 'purusottam.singh@gupshup.io', defaultRegion: 'India West' },
  { username: 'gargi.upadhyay', email: 'gargi.upadhyay@gupshup.io', defaultRegion: 'MENA' },
  { username: 'siddharth.singh', email: 'siddharth.singh@gupshup.io', defaultRegion: 'MENA' },
  { username: 'mauricio.martins', email: 'mauricio.martins@gupshup.io', defaultRegion: 'LATAM' },
  { username: 'mariana.ribeiro', email: 'mariana.ribeiro@gupshup.io', defaultRegion: 'LATAM' },
  {
    username: 'saathwik.boregowda',
    email: SAATHWIK_EMAIL,
    defaultRegion: 'Africa & Europe',
    regions: ['Africa & Europe', 'SEA']
  }
];

function normEmail(v) {
  return (v && typeof v === 'string' ? v : '').trim().toLowerCase();
}

/** Stable 50/50 split for Saathwik: Africa & Europe vs SEA. */
function regionForSaathwikActivity(activity) {
  const id = activity && activity.id != null ? String(activity.id) : '';
  const month = (activity && activity.monthOfActivity) || '';
  const seed = `${id}|${month}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 2;
  return h === 0 ? 'Africa & Europe' : 'SEA';
}

function loadDefaultSalesRepRosterByEmail() {
  const fs = require('fs');
  const path = require('path');
  const dataPath = path.join(__dirname, '../../../pams-app/js/data.js');
  const src = fs.readFileSync(dataPath, 'utf8');
  const marker = 'const DEFAULT_SALES_REPS = ';
  const start = src.indexOf(marker);
  const arrStart = src.indexOf('[', start + marker.length);
  let depth = 0;
  let end = arrStart;
  for (let i = arrStart; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  // eslint-disable-next-line no-new-func
  const reps = new Function(`return ${src.slice(arrStart, end + 1)}`)();
  const byEmail = new Map();
  for (const rep of reps) {
    const email = normEmail(rep.email);
    const region = (rep.region || '').trim();
    if (email && region) byEmail.set(email, { region, note: 'globalSalesReps default' });
  }
  return byEmail;
}

/** Presales-only map: manual list + Postgres/storage users. No globalSalesReps. */
function mergeManualIntoMap(map) {
  for (const [email, cfg] of Object.entries(MANUAL_PRESALES_REGION_BY_EMAIL)) {
    map.byEmail.set(email, {
      email,
      username: '',
      region: cfg.region,
      source: 'manual_presales'
    });
  }
  map.count = map.byEmail.size;
  map.source = `${map.source}+manual_presales`;
  return map;
}

/**
 * Who logged the activity (presales column only). Never salesRepEmail / field rep.
 */
function activityPresalesLoggerKey(activity) {
  if (!activity || typeof activity !== 'object') return '';
  const email = normEmail(activity.assignedUserEmail);
  if (email) return email;
  const name = activity.userName != null ? String(activity.userName).trim().toLowerCase() : '';
  return name;
}

/**
 * @param {string} rawIdentifier
 * @param {object} [activity]
 * @param {{ byEmail: Map, byUsername: Map }} map
 */
function resolveLoggerRegion(rawIdentifier, activity, map) {
  const id = normEmail(rawIdentifier);
  if (!id) return { region: null, matchedBy: null, key: '' };
  if (id === SAATHWIK_EMAIL && activity) {
    return {
      region: regionForSaathwikActivity(activity),
      matchedBy: 'manual_saathwik_split',
      key: id
    };
  }
  if (map.byEmail.has(id)) {
    const entry = map.byEmail.get(id);
    return {
      region: entry.region,
      matchedBy: entry.source || 'email',
      key: id
    };
  }
  if (map.byUsername.has(id)) {
    return {
      region: map.byUsername.get(id).region,
      matchedBy: 'username',
      key: id
    };
  }
  return { region: null, matchedBy: null, key: id };
}

module.exports = {
  SAATHWIK_EMAIL,
  MANUAL_PRESALES_REGION_BY_EMAIL,
  MANUAL_PRESALES_USERS,
  mergeManualIntoMap,
  resolveLoggerRegion,
  regionForSaathwikActivity,
  activityPresalesLoggerKey,
  loadDefaultSalesRepRosterByEmail
};
