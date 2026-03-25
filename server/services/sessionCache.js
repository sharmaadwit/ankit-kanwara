/**
 * Simple in-memory cache for session data.
 */
class SessionCache {
    constructor(ttlMs = 60000) {
        this.cache = new Map();
        this.ttl = ttlMs;
    }

    set(sessionId, data) {
        this.cache.set(sessionId, {
            data,
            expires: Date.now() + this.ttl
        });
    }

    get(sessionId) {
        const entry = this.cache.get(sessionId);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
            this.cache.delete(sessionId);
            return null;
        }
        return entry.data;
    }

    delete(sessionId) {
        this.cache.delete(sessionId);
    }

    clear() {
        this.cache.clear();
    }
}

module.exports = new SessionCache();
