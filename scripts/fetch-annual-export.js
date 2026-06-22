const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'Review', 'annual-activity-export.json');

(async () => {
  const url =
    'https://ankit-kanwara-production.up.railway.app/api/export/annual-user-activity?from=2025-07-01&to=2026-05-19';
  const res = await fetch(url, {
    headers: { 'X-Admin-User': 'ankit.kanwara@gupshup.io', Accept: 'application/json' }
  });
  if (!res.ok) {
    console.error('Failed', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log('Saved', OUT);
  console.log('Activities', data.meta?.totalActivitiesInRange, 'Users', data.meta?.userCount);
})();
