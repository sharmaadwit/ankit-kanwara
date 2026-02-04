/**
 * Find duplicate activities (for Jan / Yashas count debugging).
 * Run in browser console on the hosted app (after login) so DataManager is available:
 *   copy-paste this file content, or: await import('/scripts/find-activity-duplicates.js')
 *
 * Or run with Node against a backup JSON that has { activities: [], internalActivities: [] }:
 *   node scripts/find-activity-duplicates.js path/to/backup.json
 */

(function () {
    const isNode = typeof window === 'undefined';
    let activities = [];
    let internalActivities = [];

    if (isNode) {
        const path = require('path');
        const fs = require('fs');
        const file = process.argv[2];
        if (!file) {
            console.log('Usage: node find-activity-duplicates.js <backup.json>');
            process.exit(1);
        }
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        activities = data.activities || [];
        internalActivities = data.internalActivities || [];
    } else {
        if (typeof DataManager === 'undefined') {
            console.warn('DataManager not found. Run this in the app page after login.');
            return;
        }
        activities = DataManager.getActivities();
        internalActivities = DataManager.getInternalActivities();
    }

    const resolveMonth = (a) => {
        const mo = (a.monthOfActivity || '').trim();
        if (/^\d{4}-\d{2}$/.test(mo)) return mo;
        const d = a.date;
        if (typeof d === 'string' && d.length >= 7) return d.substring(0, 7);
        return null;
    };

    const internalIds = new Set(internalActivities.map(a => a.id));
    const inBoth = activities.filter(a => internalIds.has(a.id));
    const externalOnly = activities.filter(a => !internalIds.has(a.id));

    const firstSeen = new Set();
    const duplicateIdsInExternal = [];
    const externalDeduped = [];
    externalOnly.forEach(a => {
        if (firstSeen.has(a.id)) duplicateIdsInExternal.push(a.id);
        else { firstSeen.add(a.id); externalDeduped.push(a); }
    });
    const byMonth = {};
    const byUser = {};
    [...externalDeduped, ...internalActivities].forEach(a => {
        const month = resolveMonth(a) || 'Unknown';
        byMonth[month] = (byMonth[month] || 0) + 1;
        const user = a.userName || a.assignedUserEmail || a.userId || 'Unknown';
        byUser[user] = (byUser[user] || 0) + 1;
    });

    const janKey = '2026-01';
    const janCount = (byMonth[janKey] || 0);
    const yashasCount = Object.entries(byUser).filter(([name]) =>
        String(name).toLowerCase().includes('yashas')
    ).reduce((sum, [, n]) => sum + n, 0);

    console.log('=== Activity duplicate report ===');
    console.log('External (activities key):', activities.length);
    console.log('Internal (internalActivities key):', internalActivities.length);
    console.log('In BOTH keys (merge corruption):', inBoth.length, inBoth.length ? inBoth.map(a => a.id).slice(0, 10) : '');
    console.log('Duplicate ids within external:', duplicateIdsInExternal.length, duplicateIdsInExternal.length ? [...new Set(duplicateIdsInExternal)].slice(0, 10) : '');
    console.log('External after dedupe (no internal, no dup ids):', externalDeduped.length);
    console.log('Total unique (external deduped + internal):', externalDeduped.length + internalActivities.length);
    console.log('');
    console.log('By month (user activity date only):', byMonth);
    console.log('Jan 2026 count (user date only):', janCount);
    console.log('');
    console.log('By user (sample):', Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 20));
    console.log('Yashas count (name contains "yashas"):', yashasCount);
})();
