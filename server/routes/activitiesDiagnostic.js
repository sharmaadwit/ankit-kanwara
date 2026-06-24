/**
 * Activities diagnostic + safe rebuild (token-protected, temporary).
 *
 * Architecture recap:
 *  - `activities`                      -> TEAM reporting JSON (all users, recent window). Dashboard + Reports read this.
 *  - `activities:YYYY-MM:<userId>`     -> PER-USER buckets (one-time split snapshot from migration).
 *
 * The dashboard/reports read the team `activities` key with NO user filter (verified in data.js:
 * getActivities / getAllActivities). So if a user only sees their own numbers, the TEAM key itself
 * is missing other users' rows. These endpoints let us (1) confirm that, and (2) safely restore it.
 *
 * GET  /api/admin/diagnose-activities    -> read-only. Reports composition of team key + buckets.
 * POST /api/admin/rebuild-team-activities -> additive ONLY. Unions team key with recent-window buckets,
 *                                            archives current value first, and refuses to shrink. No deletes.
 */
const { getPool } = require('../db');
const logger = require('../logger');

const RECENT_BACK = 3; // months back
const RECENT_FWD = 3;  // months forward

const parseArray = (raw) => {
  if (raw == null) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const recentMonths = (now = new Date()) => {
  const months = [];
  for (let i = RECENT_BACK; i > 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7));
  }
  months.push(now.toISOString().slice(0, 7));
  for (let i = 1; i <= RECENT_FWD; i++) {
    months.push(new Date(now.getFullYear(), now.getMonth() + i, 1).toISOString().slice(0, 7));
  }
  return months;
};

const activityTime = (a) => {
  const t = new Date(a && (a.updatedAt || a.createdAt || a.date) || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** Union by id; newer (updatedAt/createdAt/date) wins. Never drops an id present in either set. */
const unionById = (base, extra) => {
  const map = new Map();
  const put = (a) => {
    if (!a || a.id == null) return;
    const key = String(a.id);
    const existing = map.get(key);
    if (!existing || activityTime(a) >= activityTime(existing)) {
      map.set(key, a);
    }
  };
  base.forEach(put);
  extra.forEach(put);
  return Array.from(map.values());
};

const countByUser = (arr) => {
  const counts = {};
  arr.forEach((a) => {
    const uid = (a && (a.userId || a.assignedUserId)) || 'unknown';
    counts[uid] = (counts[uid] || 0) + 1;
  });
  return counts;
};

const verifyToken = (req) => {
  const token = req.get('x-migration-token');
  const expected = process.env.MIGRATION_TOKEN || 'temp-migration-2026';
  return token === expected;
};

/**
 * Mount the diagnostic routes on an express app. Called from app.js before auth middleware.
 */
function registerActivitiesDiagnostic(app) {
  // READ-ONLY: dump a single storage key's value (for inspecting config like industryUseCases).
  app.get('/api/admin/diagnose-storage', async (req, res) => {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const key = String(req.query.key || '').trim();
      if (!key) return res.status(400).json({ error: 'Missing ?key=' });
      const { rows } = await getPool().query(
        'SELECT value, updated_at FROM storage WHERE key = $1',
        [key]
      );
      if (!rows.length) return res.json({ ok: true, key, exists: false, value: null });
      let value = rows[0].value;
      try { value = typeof value === 'string' ? JSON.parse(value) : value; } catch (_) { /* keep raw */ }
      res.json({ ok: true, key, exists: true, updatedAt: rows[0].updated_at, value });
    } catch (error) {
      logger.error('diagnose_storage_failed', { message: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ADDITIVE remap of industryUseCases: copy a source industry's use cases onto target industries
  // (union, case-insensitive dedupe). Archives the current map first; never deletes any key.
  app.post('/api/admin/remap-industry-usecases', async (req, res) => {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const mapping = (req.body && req.body.mapping) || {
      'BFSI': ['Banking', 'Fintech', 'Insurance'],
      'Retail & eCommerce': ['Retail'],
      'Government': ['Government & Public Sector'],
      'Media': ['Media & Entertainment']
    };
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT value, updated_at FROM storage WHERE key = 'industryUseCases' FOR UPDATE`
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'industryUseCases not found' });
      }
      let raw = rows[0].value;
      let decoded = raw;
      if (typeof raw === 'string' && raw.startsWith('__lz__')) {
        const LZ = require('../../pams-app/js/vendor/lz-string.js');
        decoded = LZ.decompressFromBase64(raw.slice(6));
      }
      const map = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;

      const unionInto = (target, additions) => {
        const cur = map[target] || [];
        const seen = new Set(cur.map((s) => String(s).toLowerCase()));
        const out = cur.slice();
        (additions || []).forEach((uc) => {
          const k = String(uc || '').trim();
          if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
        });
        out.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
        map[target] = out;
      };

      const summary = {};
      Object.keys(mapping).forEach((src) => {
        const source = map[src] || [];
        (mapping[src] || []).forEach((target) => {
          const before = (map[target] || []).length;
          unionInto(target, source);
          summary[target] = { from: src, sourceCount: source.length, before, after: map[target].length };
        });
      });

      await client.query(
        `INSERT INTO storage_history (key, value, updated_at, archived_at)
         VALUES ('industryUseCases', $1, $2, NOW())`,
        [rows[0].value, rows[0].updated_at]
      );
      await client.query(
        `UPDATE storage SET value = $1, updated_at = NOW() WHERE key = 'industryUseCases'`,
        [JSON.stringify(map)]
      );
      await client.query('COMMIT');
      logger.info('remap_industry_usecases', { summary });
      res.json({ ok: true, summary });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('remap_industry_usecases_failed', { message: error.message, stack: error.stack });
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  });

  // Apply use-case changes: additive union into industryUseCases[industry] for each key in `additions`,
  // and (optionally) REPLACE the universalUseCases list with `universal`. Archives both keys first.
  app.post('/api/admin/apply-usecases', async (req, res) => {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const additions = (req.body && req.body.additions) || {};
    const universal = req.body && Array.isArray(req.body.universal) ? req.body.universal : null;
    const client = await getPool().connect();
    const LZ = require('../../pams-app/js/vendor/lz-string.js');
    const decode = (raw) => {
      if (raw == null) return null;
      let s = raw;
      if (typeof s === 'string' && s.startsWith('__lz__')) s = LZ.decompressFromBase64(s.slice(6));
      try { return typeof s === 'string' ? JSON.parse(s) : s; } catch (_) { return null; }
    };
    const dedupSort = (arr) => {
      const seen = new Set(); const out = [];
      (arr || []).forEach((u) => {
        const k = String(u || '').trim();
        if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
      });
      out.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
      return out;
    };
    try {
      await client.query('BEGIN');
      const summary = { industries: {}, universal: null };

      if (Object.keys(additions).length) {
        const { rows } = await client.query(
          `SELECT value, updated_at FROM storage WHERE key = 'industryUseCases' FOR UPDATE`
        );
        const map = (rows.length && decode(rows[0].value)) || {};
        if (rows.length) {
          await client.query(
            `INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ('industryUseCases', $1, $2, NOW())`,
            [rows[0].value, rows[0].updated_at]
          );
        }
        Object.keys(additions).forEach((ind) => {
          const before = (map[ind] || []).length;
          map[ind] = dedupSort([...(map[ind] || []), ...(additions[ind] || [])]);
          summary.industries[ind] = { before, after: map[ind].length, added: additions[ind] };
        });
        await client.query(
          `INSERT INTO storage (key, value, updated_at) VALUES ('industryUseCases', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
          [JSON.stringify(map)]
        );
      }

      if (universal) {
        const { rows } = await client.query(
          `SELECT value, updated_at FROM storage WHERE key = 'universalUseCases' FOR UPDATE`
        );
        if (rows.length) {
          await client.query(
            `INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ('universalUseCases', $1, $2, NOW())`,
            [rows[0].value, rows[0].updated_at]
          );
        }
        const list = dedupSort(universal);
        await client.query(
          `INSERT INTO storage (key, value, updated_at) VALUES ('universalUseCases', $1, NOW())
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
          [JSON.stringify(list)]
        );
        summary.universal = { count: list.length };
      }

      await client.query('COMMIT');
      logger.info('apply_usecases', { summary });
      res.json({ ok: true, summary });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('apply_usecases_failed', { message: error.message, stack: error.stack });
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  });

  // READ-ONLY: report composition of the team key and the per-user buckets.
  app.get('/api/admin/diagnose-activities', async (req, res) => {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const pool = getPool();

      const teamRow = await pool.query(`SELECT value, updated_at FROM storage WHERE key = 'activities'`);
      const teamArr = teamRow.rows.length ? parseArray(teamRow.rows[0].value) : [];

      const bucketRows = await pool.query(
        `SELECT key, value FROM storage WHERE key ~ '^activities:[0-9]{4}-[0-9]{2}:'`
      );
      const months = recentMonths();
      let bucketTotal = 0;
      let recentBucketArr = [];
      const bucketsByMonth = {};
      bucketRows.rows.forEach((row) => {
        const arr = parseArray(row.value);
        bucketTotal += arr.length;
        const m = (row.key.split(':')[1]) || '';
        bucketsByMonth[m] = (bucketsByMonth[m] || 0) + arr.length;
        if (months.includes(m)) recentBucketArr = recentBucketArr.concat(arr);
      });

      const unionRecent = unionById(teamArr, recentBucketArr);

      res.json({
        ok: true,
        now: new Date().toISOString(),
        recentWindow: months,
        teamKey: {
          total: teamArr.length,
          byUser: countByUser(teamArr),
          updatedAt: teamRow.rows.length ? teamRow.rows[0].updated_at : null
        },
        perUserBuckets: {
          bucketCount: bucketRows.rows.length,
          totalRows: bucketTotal,
          rowsByMonth: bucketsByMonth
        },
        rebuildPreview: {
          recentBucketRows: recentBucketArr.length,
          unionWithTeam: unionRecent.length,
          wouldAdd: Math.max(0, unionRecent.length - teamArr.length),
          unionByUser: countByUser(unionRecent)
        }
      });
    } catch (error) {
      logger.error('diagnose_activities_failed', { message: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ADDITIVE-ONLY: union team key with recent-window buckets. Archives first. Refuses to shrink.
  app.post('/api/admin/rebuild-team-activities', async (req, res) => {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Unauthorized' });
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      const teamRow = await client.query(
        `SELECT value, updated_at FROM storage WHERE key = 'activities' FOR UPDATE`
      );
      const teamArr = teamRow.rows.length ? parseArray(teamRow.rows[0].value) : [];

      const bucketRows = await client.query(
        `SELECT key, value FROM storage WHERE key ~ '^activities:[0-9]{4}-[0-9]{2}:'`
      );
      const months = recentMonths();
      let recentBucketArr = [];
      bucketRows.rows.forEach((row) => {
        const m = (row.key.split(':')[1]) || '';
        if (months.includes(m)) recentBucketArr = recentBucketArr.concat(parseArray(row.value));
      });

      const union = unionById(teamArr, recentBucketArr);

      // Safety: never write a smaller set than what's already there.
      if (union.length < teamArr.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Refusing to shrink team activities',
          before: teamArr.length,
          computed: union.length
        });
      }

      // No change needed.
      if (union.length === teamArr.length) {
        await client.query('ROLLBACK');
        return res.json({
          ok: true,
          changed: false,
          before: teamArr.length,
          after: union.length,
          message: 'Team key already contains all recent-window activities; nothing to add.'
        });
      }

      // Insurance: archive current value before overwrite.
      if (teamRow.rows.length) {
        await client.query(
          `INSERT INTO storage_history (key, value, updated_at, archived_at)
           VALUES ('activities', $1, $2, NOW())`,
          [teamRow.rows[0].value, teamRow.rows[0].updated_at]
        );
      }

      await client.query(
        `INSERT INTO storage (key, value, updated_at) VALUES ('activities', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
        [JSON.stringify(union)]
      );

      await client.query('COMMIT');

      logger.info('rebuild_team_activities', { before: teamArr.length, after: union.length });
      res.json({
        ok: true,
        changed: true,
        before: teamArr.length,
        after: union.length,
        added: union.length - teamArr.length,
        byUser: countByUser(union)
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error('rebuild_team_activities_failed', { message: error.message, stack: error.stack });
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  });
}

module.exports = { registerActivitiesDiagnostic };
