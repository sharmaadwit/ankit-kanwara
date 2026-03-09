#!/usr/bin/env node
/**
 * Cube Analysis for February (or any month): activities + use cases only.
 * Reads a storage snapshot JSON and prints the Cube Analysis in the agreed text format.
 *
 * Usage:
 *   node server/scripts/cube-analysis-feb.js [path-to-snapshot.json]
 *   node server/scripts/cube-analysis-feb.js backups/storage-snapshot-latest.json
 *   node server/scripts/cube-analysis-feb.js    (uses backups/ and latest by mtime)
 *
 * Snapshot must have: data.activities or data['activities:YYYY-MM'], and data.accounts.
 */

const fs = require('fs');
const path = require('path');

const CANONICAL_USE_CASES = [
    'Lead gen & onboarding',
    'Customer engagement & campaigns',
    'Support & FAQ',
    'Sales discovery & AI recommendation',
    'Operational automation'
];
const USE_CASE_KEYWORDS = [
    ['lead gen', 'onboarding', 'lead capture', 'kyc', 'recruitment', 'property', 'inquiry', 'qualification'],
    ['engagement', 'campaign', 'notification', 'alert', 'marketing', 'broadcast', 'promotion', 'voucher', 'coupon', 'loyalty', 'retention', 're-engagement', 'incentive', 'fan engagement', 'o2o'],
    ['support', 'faq', 'service', 'helpdesk', 'complaint', 'enquir'],
    ['sales', 'discovery', 'ai recommendation', 'virtual shopper', 'advisor', 'catalog', 'commerce', 'conversion', 'checkout', 'beauty', 'fashion'],
    ['operational', 'automation', 'back-office', 'efficiency', 'reporting', 'logistics', 'workflow', 'collection', 'document validation', 'tracking']
];

function matchUseCaseToBucket(text) {
    if (!text || typeof text !== 'string') return -1;
    const t = text.toLowerCase();
    for (let i = 0; i < USE_CASE_KEYWORDS.length; i++) {
        if (USE_CASE_KEYWORDS[i].some(kw => t.includes(kw))) return i;
    }
    return -1;
}

function resolveActivityMonth(a) {
    const d = a && (a.date || a.createdAt);
    if (!d) return null;
    const s = typeof d === 'string' ? d : (d.toISOString && d.toISOString()) || '';
    return s.length >= 7 ? s.substring(0, 7) : null;
}

function loadSnapshot(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const snap = JSON.parse(raw);
    return snap.data || snap;
}

function getActivitiesFromData(data, periodMonth) {
    const out = [];
    for (const k of Object.keys(data)) {
        if (k !== 'activities' && !k.match(/^activities:\d{4}-\d{2}$/)) continue;
        const arr = data[k];
        if (!Array.isArray(arr)) continue;
        for (const a of arr) {
            const m = resolveActivityMonth(a);
            if (m === periodMonth) out.push(a);
        }
    }
    return out;
}

function getAccounts(data) {
    const acc = data.accounts;
    return Array.isArray(acc) ? acc : [];
}

function runCubeAnalysis(activities, accounts, periodMonth) {
    const bucketStats = CANONICAL_USE_CASES.map(() => ({
        industries: new Set(),
        activityCount: 0,
        regionActivityCount: new Map(),
        regionAccountIds: new Map()
    }));

    function addToBucket(bucketIdx, region, industry, accountId) {
        if (bucketIdx < 0) return;
        const b = bucketStats[bucketIdx];
        b.activityCount++;
        b.industries.add(industry || '—');
        if (region && region !== 'Unassigned') {
            b.regionActivityCount.set(region, (b.regionActivityCount.get(region) || 0) + 1);
            if (accountId) {
                if (!b.regionAccountIds.has(region)) b.regionAccountIds.set(region, new Set());
                b.regionAccountIds.get(region).add(accountId);
            }
        }
    }

    const external = activities.filter(a => !a.isInternal && a.accountId);
    for (const activity of external) {
        const account = accounts.find(ac => ac.id === activity.accountId);
        const project = account && account.projects && account.projects.find(p => p.id === activity.projectId);
        const industry = account && account.industry ? String(account.industry).trim() : null;
        const region = activity.salesRepRegion || activity.region || (account && (account.salesRepRegion || account.region)) || 'Unassigned';
        const useCases = project && project.useCases ? (Array.isArray(project.useCases) ? project.useCases : [project.useCases]) : [];
        for (const uc of useCases) {
            const label = typeof uc === 'string' ? uc.trim() : (uc && typeof uc === 'object' && uc.name) ? String(uc.name).trim() : null;
            if (!label) continue;
            const bucketIdx = matchUseCaseToBucket(label);
            addToBucket(bucketIdx, region, industry, activity.accountId);
        }
    }

    const regionCounts = {};
    external.forEach(a => {
        const account = accounts.find(ac => ac.id === a.accountId);
        const region = a.salesRepRegion || a.region || (account && (account.salesRepRegion || account.region)) || 'Unassigned';
        regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    const regionsOrdered = Object.keys(regionCounts).sort((a, b) => (regionCounts[b] || 0) - (regionCounts[a] || 0));

    const useCaseCards = CANONICAL_USE_CASES.map((title, i) => {
        const b = bucketStats[i];
        const indList = Array.from(b.industries).filter(x => x !== '—').sort();
        const totalAccounts = new Set();
        b.regionAccountIds.forEach((set) => set.forEach((id) => totalAccounts.add(id)));
        return {
            name: title,
            industries: indList,
            activityCount: b.activityCount,
            accountCount: totalAccounts.size
        };
    });

    const regionTopUseCase = [];
    const allRegions = new Set();
    bucketStats.forEach((b) => b.regionActivityCount.forEach((_, reg) => allRegions.add(reg)));
    allRegions.forEach((region) => {
        let maxCount = 0;
        let topBucketIdx = -1;
        CANONICAL_USE_CASES.forEach((_, i) => {
            const c = bucketStats[i].regionActivityCount.get(region) || 0;
            if (c > maxCount) { maxCount = c; topBucketIdx = i; }
        });
        if (topBucketIdx >= 0 && maxCount > 0) {
            const accountIds = bucketStats[topBucketIdx].regionAccountIds.get(region);
            regionTopUseCase.push({
                region,
                useCaseName: CANONICAL_USE_CASES[topBucketIdx],
                activityCount: maxCount,
                accountCount: accountIds ? accountIds.size : 0
            });
        }
    });
    regionTopUseCase.sort((a, b) => b.activityCount - a.activityCount);

    return {
        total: activities.length,
        external: external.length,
        internal: activities.length - external.length,
        regionsOrdered: regionsOrdered.slice(0, 3),
        useCaseCards,
        regionTopUseCase
    };
}

function formatOutput(result, periodLabel) {
    const lines = [];
    lines.push('CUBE ANALYSIS – ' + periodLabel);
    lines.push('');
    lines.push('Summary');
    lines.push('Total activities: ' + result.total + ' (' + result.external + ' external). Top regions: ' + (result.regionsOrdered.join(', ') || '—') + '.');
    lines.push('');
    lines.push('Top 5 use cases (from activity data only)');
    lines.push('————————————————————————————————————————');
    result.useCaseCards.forEach((card, i) => {
        lines.push((i + 1) + '. ' + card.name);
        lines.push('   Industries: ' + (card.industries.length ? card.industries.join(', ') : '—'));
        lines.push('   ' + card.activityCount + ' activities in period, ' + card.accountCount + ' separate accounts.');
        lines.push('');
    });
    lines.push('By region – top use case (most activities)');
    lines.push('————————————————————————————————————————');
    if (result.regionTopUseCase.length === 0) {
        lines.push('No region breakdown (no external activities with use case in this period).');
    } else {
        result.regionTopUseCase.forEach(r => {
            lines.push('• ' + r.region + ': ' + r.useCaseName + ' (' + r.activityCount + ' activities)');
        });
    }
    return lines.join('\n');
}

// main
const projectRoot = path.join(__dirname, '..', '..');
const backupsDir = path.join(projectRoot, 'backups');
let periodMonth = '2026-02';
let fileArg = null;
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.match(/^\d{4}-\d{2}$/)) periodMonth = a;
    else if (a.endsWith('.json')) fileArg = a;
}

let filePath = fileArg ? path.resolve(projectRoot, fileArg) : null;
if (!filePath && fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(backupsDir, f))
        .sort((a, b) => (fs.statSync(b).mtime || 0) - (fs.statSync(a).mtime || 0));
    if (files.length) filePath = files[0];
}

if (!filePath || !fs.existsSync(filePath)) {
    console.log('Usage: node server/scripts/cube-analysis-feb.js [YYYY-MM] [path-to-snapshot.json]');
    console.log('Example: node server/scripts/cube-analysis-feb.js 2026-02 backups/storage-snapshot-latest.json');
    console.log('No snapshot file found. Put a storage snapshot JSON in backups/ or pass the file path.');
    process.exit(1);
}

const data = loadSnapshot(filePath);
const activities = getActivitiesFromData(data, periodMonth);
const accounts = getAccounts(data);
const periodLabel = periodMonth === '2026-02' ? 'February 2026' : periodMonth;

const result = runCubeAnalysis(activities, accounts, periodMonth);
console.log(formatOutput(result, periodLabel));
