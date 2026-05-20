/**
 * Annual report (PDF) only — extra presales logger → region overrides.
 * NOT merged into Postgres Users sync or live activity shards.
 * Used only when patching migration_draft_* / migration_confirmed_* activity keys.
 */

const { normEmail } = require('./manualPresalesRegionByEmail');

/** @type {Record<string, string>} */
const ANNUAL_REPORT_EXTRA_EMAIL_TO_REGION = {
  'matheus.thieme@gupshup.io': 'LATAM',
  'gourav.sarkar@gupshup.io': 'India North',
  'saurabh.tripathi@gupshup.io': 'Africa & Europe',
  'adwit.sharma@gupshup.io': 'ROW'
};

/** userName / presales username when email missing (Samrudha typo: summukha) */
const ANNUAL_REPORT_EXTRA_USERNAME_TO_REGION = {
  samruddha: 'India West',
  samrudha: 'India West',
  'samruddha patnaik': 'India West'
};

function mergeAnnualReportPresalesIntoMap(map) {
  for (const [email, region] of Object.entries(ANNUAL_REPORT_EXTRA_EMAIL_TO_REGION)) {
    const key = normEmail(email);
    if (!key) continue;
    map.byEmail.set(key, {
      email: key,
      username: '',
      region,
      source: 'annual_report_only'
    });
  }
  for (const [username, region] of Object.entries(ANNUAL_REPORT_EXTRA_USERNAME_TO_REGION)) {
    const key = (username || '').trim().toLowerCase();
    if (!key) continue;
    map.byUsername.set(key, { region, source: 'annual_report_only' });
  }
  map.count = map.byEmail.size;
  map.source = `${map.source}+annual_report_only`;
  return map;
}

module.exports = {
  ANNUAL_REPORT_EXTRA_EMAIL_TO_REGION,
  ANNUAL_REPORT_EXTRA_USERNAME_TO_REGION,
  mergeAnnualReportPresalesIntoMap
};
