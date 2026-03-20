/**
 * In-memory session store for local dev when DB is unavailable.
 * Active only when ALLOW_DEV_LOGIN=true and NODE_ENV !== 'production'.
 * Credentials: username dev, password dev (see docs/LOCAL_DEV_LOGIN.md).
 */

const DEV_USER = {
  id: 'dev-user-id',
  username: 'dev',
  email: 'dev@local.test',
  roles: ['Admin', 'Presales'],
  regions: [],
  salesReps: [],
  defaultRegion: ''
};

const sessions = new Map(); // sessionId -> { userId, username, email, roles, regions, salesReps, defaultRegion }

const isDevLoginAllowed = () => {
  if (process.env.NODE_ENV === 'production') return false;
  return String(process.env.ALLOW_DEV_LOGIN || '').toLowerCase() === 'true';
};

const setDevSession = (sessionId, user = DEV_USER) => {
  if (!isDevLoginAllowed()) return;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  sessions.set(sessionId, {
    userId: user.id,
    username: user.username,
    email: user.email || null,
    roles: user.roles || [],
    regions: user.regions || [],
    salesReps: user.salesReps || [],
    defaultRegion: user.defaultRegion || '',
    expiresAt
  });
};

const getDevSession = (sessionId) => {
  if (!isDevLoginAllowed() || !sessionId || typeof sessionId !== 'string') return null;
  const entry = sessions.get(sessionId.trim());
  if (!entry || (entry.expiresAt && new Date() > entry.expiresAt)) {
    if (entry) sessions.delete(sessionId.trim());
    return null;
  }
  return {
    userId: entry.userId,
    username: entry.username,
    email: entry.email,
    roles: entry.roles,
    regions: entry.regions,
    salesReps: entry.salesReps,
    defaultRegion: entry.defaultRegion
  };
};

const destroyDevSession = (sessionId) => {
  if (sessionId) sessions.delete(String(sessionId).trim());
};

module.exports = {
  isDevLoginAllowed,
  DEV_USER,
  setDevSession,
  getDevSession,
  destroyDevSession
};
