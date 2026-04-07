const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pams_sid';

/**
 * Resolve server session id from Authorization: Bearer, session cookie, or (logout) JSON body.
 */
function getSessionIdFromRequest(req, { includeBody = false } = {}) {
  const authz = req.get('authorization') || '';
  const m = /^Bearer\s+(\S+)/i.exec(authz);
  if (m) return m[1];
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  if (includeBody && req.body && typeof req.body.authSessionId === 'string') {
    const s = req.body.authSessionId.trim();
    return s || null;
  }
  return null;
}

module.exports = {
  SESSION_COOKIE_NAME,
  getSessionIdFromRequest
};
