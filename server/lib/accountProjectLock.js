/**
 * In-memory lock by account + project. Max hold 60 seconds; no lock can be held longer.
 * Used so concurrent edits only block the same account+project, not the whole DB.
 * For multi-instance deploys, replace with Redis or DB-backed lock.
 */

const LOCK_TTL_MS = 60 * 1000; // 60 seconds max hold

const locks = new Map();

function key(accountId, projectId) {
  const a = accountId == null ? '' : String(accountId);
  const p = projectId == null ? '' : String(projectId);
  return `ap:${a}:${p}`;
}

/**
 * Consider lock expired if past expiresAt. Removes stale entry so acquire can succeed.
 */
function pruneIfExpired(k) {
  const entry = locks.get(k);
  if (!entry) return;
  if (Date.now() > entry.expiresAt) {
    locks.delete(k);
  }
}

/**
 * Try to acquire lock for this account+project. Lock always expires after LOCK_TTL_MS.
 * @returns { boolean } true if acquired, false if already held (and not expired)
 */
function acquire(accountId, projectId) {
  const k = key(accountId, projectId);
  pruneIfExpired(k);
  if (locks.has(k)) return false;
  locks.set(k, { expiresAt: Date.now() + LOCK_TTL_MS });
  return true;
}

/**
 * Release lock. Safe to call even if not held.
 */
function release(accountId, projectId) {
  locks.delete(key(accountId, projectId));
}

module.exports = {
  LOCK_TTL_MS,
  acquire,
  release
};
