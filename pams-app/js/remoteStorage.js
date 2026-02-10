(function () {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    const originalLocalStorage = window.localStorage;

    const explicitFlag = window.__FORCE_REMOTE_STORAGE__;
    const hostname = window.location.hostname || '';
    const shouldForceRemote =
        explicitFlag === true ||
        (explicitFlag !== false &&
            hostname &&
            hostname !== 'localhost' &&
            hostname !== '127.0.0.1' &&
            !hostname.endsWith('.local'));

    if (!shouldForceRemote) {
        window.__REMOTE_STORAGE_ENABLED__ = false;
        return;
    }

    const API_BASE = window.__REMOTE_STORAGE_BASE__ || '/api/storage';
    const COMPRESSION_PREFIX = '__lz__';
    const MIN_COMPRESS_LENGTH = 2048;

    const hasCompression = typeof window.LZString === 'object' && window.LZString;

    const maybeCompressValue = (value) => {
        if (!hasCompression || typeof value !== 'string' || value.length < MIN_COMPRESS_LENGTH) {
            return value;
        }
        try {
            const compressed = window.LZString.compressToBase64(value);
            if (compressed && compressed.length < value.length) {
                return COMPRESSION_PREFIX + compressed;
            }
        } catch (error) {
            console.warn('Remote storage compression skipped:', error);
        }
        return value;
    };

    const maybeDecompressValue = (value) => {
        if (!hasCompression || typeof value !== 'string' || !value.startsWith(COMPRESSION_PREFIX)) {
            return value;
        }
        try {
            const restored = window.LZString.decompressFromBase64(
                value.slice(COMPRESSION_PREFIX.length)
            );
            return restored != null ? restored : value;
        } catch (error) {
            console.warn('Remote storage decompression failed:', error);
            return value;
        }
    };

    const ACTIVITIES_KEY = 'activities';
    const ACTIVITIES_MANIFEST_KEY = '__shard_manifest:activities__';
    const LOCAL_BACKUP_PREFIX = '__pams_backup__';
    const CACHE_BUSTER_KEY = '__pams_cache_version__';
    // Increment this version on each deployment to clear stale local caches
    const CACHE_BUSTER_VERSION = '2026-02-09-v1';

    /** Clear all local backup keys if the cache buster version has changed. */
    const clearStaleLocalBackups = () => {
        try {
            if (typeof originalLocalStorage.getItem !== 'function') return;
            const storedVersion = originalLocalStorage.getItem(CACHE_BUSTER_KEY);
            if (storedVersion === CACHE_BUSTER_VERSION) return;
            // Version mismatch: clear all __pams_backup__ keys
            const keysToRemove = [];
            for (let i = 0; i < originalLocalStorage.length; i++) {
                const key = originalLocalStorage.key(i);
                if (key && key.startsWith(LOCAL_BACKUP_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => {
                try { originalLocalStorage.removeItem(k); } catch (e) { }
            });
            originalLocalStorage.setItem(CACHE_BUSTER_KEY, CACHE_BUSTER_VERSION);
            if (typeof console !== 'undefined' && console.log) {
                console.log('[RemoteStorage] Cache buster: cleared ' + keysToRemove.length + ' stale backup keys for version ' + CACHE_BUSTER_VERSION);
            }
        } catch (e) {
            // ignore
        }
    };
    // Run cache buster on load
    clearStaleLocalBackups();

    /** Write last-good payload to browser localStorage so we can recover if overwrite happens. */
    const saveLocalBackup = (storageKey, serializedValue) => {
        try {
            if (typeof originalLocalStorage.setItem !== 'function' || !serializedValue) return;
            originalLocalStorage.setItem(LOCAL_BACKUP_PREFIX + storageKey, serializedValue);
            originalLocalStorage.setItem(LOCAL_BACKUP_PREFIX + storageKey + '_at', String(Date.now()));
        } catch (e) {
            // ignore quota or disabled storage
        }
    };

    /** Read local backup for a key (last-good value from this device). */
    const getLocalBackup = (storageKey) => {
        try {
            if (typeof originalLocalStorage.getItem !== 'function') return null;
            const raw = originalLocalStorage.getItem(LOCAL_BACKUP_PREFIX + storageKey);
            return raw || null;
        } catch (e) {
            return null;
        }
    };

    /** Backup timestamp (ms); used to avoid merging very stale backup. */
    const getLocalBackupAt = (storageKey) => {
        try {
            if (typeof originalLocalStorage.getItem !== 'function') return null;
            const raw = originalLocalStorage.getItem(LOCAL_BACKUP_PREFIX + storageKey + '_at');
            if (!raw) return null;
            const n = parseInt(raw, 10);
            return Number.isNaN(n) ? null : n;
        } catch (e) {
            return null;
        }
    };

    /** Max age for backup recovery: don't merge backup older than this (avoid stale/wrong device data). */
    const MAX_BACKUP_AGE_MS = 72 * 60 * 60 * 1000;

    /** Basic sanity: for accounts, items should be objects with id. */
    const looksLikeValidAccountsArray = (arr) => {
        if (!Array.isArray(arr) || !arr.length) return false;
        return arr.slice(0, 5).every(function (item) {
            return item && typeof item === 'object' && (item.id != null || item.accountName != null);
        });
    };

    /** Basic sanity: for internalActivities, items should be objects. */
    const looksLikeValidInternalArray = (arr) => {
        if (!Array.isArray(arr)) return false;
        return arr.length === 0 || (arr[0] && typeof arr[0] === 'object');
    };

    /**
     * If server has fewer items than our local backup, merge server with backup so we don't overwrite with stale data.
     * Safety: backup max age 72h, valid shape (accounts: objects with id; internalActivities: objects), only when backup has more items.
     */
    const applyBackupRecovery = (key, serverStr) => {
        const backupRaw = getLocalBackup(key);
        if (!backupRaw) return serverStr;
        const backupAt = getLocalBackupAt(key);
        if (backupAt != null && (Date.now() - backupAt) > MAX_BACKUP_AGE_MS) return serverStr;
        const serverArr = safeJsonParse(serverStr);
        const backupArr = safeJsonParse(backupRaw);
        if (!Array.isArray(serverArr) || !Array.isArray(backupArr)) return serverStr;
        if (backupArr.length <= serverArr.length) return serverStr;
        if (key === 'accounts' && !looksLikeValidAccountsArray(backupArr)) return serverStr;
        if (key === 'internalActivities' && !looksLikeValidInternalArray(backupArr)) return serverStr;
        const merged = mergeArrayById(serverStr, backupRaw);
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('[RemoteStorage] Server had fewer ' + key + ' than local backup (' + serverArr.length + ' vs ' + backupArr.length + '). Merged backup into server before save.');
        }
        return merged;
    };
    const ACTIVITY_BUCKET_PREFIX = 'activities:';
    const SHARD_POINTER_TOKEN = '__shards__:activities';

    const shardCache = {
        [ACTIVITIES_KEY]: {
            version: null,
            value: null
        }
    };

    const isShardBucketKey = (key) =>
        typeof key === 'string' && key.startsWith(ACTIVITY_BUCKET_PREFIX);

    const isShardInternalKey = (key) =>
        key === ACTIVITIES_MANIFEST_KEY || isShardBucketKey(key);

    const filterVisibleKeys = (keys) =>
        (Array.isArray(keys) ? keys : []).filter((key) => !isShardInternalKey(key));

    const safeJsonParse = (input) => {
        if (typeof input !== 'string' || !input.length) {
            return null;
        }
        try {
            return JSON.parse(input);
        } catch (error) {
            console.warn('Remote storage JSON parse error:', error);
            return null;
        }
    };

    /** Merge two JSON arrays by id: server items not in ours are kept, ours win for same id. For parallel-safe updates. */
    const mergeArrayById = (serverJson, ourJson) => {
        const serverArr = Array.isArray(safeJsonParse(serverJson)) ? safeJsonParse(serverJson) : [];
        const ourArr = Array.isArray(safeJsonParse(ourJson)) ? safeJsonParse(ourJson) : [];
        const ourIds = new Set(ourArr.map((item) => item.id).filter(Boolean));
        const merged = [...serverArr.filter((s) => !ourIds.has(s.id)), ...ourArr];
        return JSON.stringify(merged);
    };

    /** Pick later of two date strings (updatedAt or createdAt). */
    const getItemTimestamp = (item) => {
        if (!item || typeof item !== 'object') return '';
        const t = item.updatedAt || item.createdAt;
        return t ? String(t) : '';
    };

    /** Merge two arrays by id: add missing from both, for same id keep the one with newer updatedAt/createdAt. */
    const mergeArrayByIdNewerWins = (serverArr, localArr) => {
        if (!Array.isArray(serverArr)) serverArr = [];
        if (!Array.isArray(localArr)) localArr = [];
        const byId = new Map();
        serverArr.forEach((s) => {
            if (s && s.id) byId.set(s.id, s);
        });
        localArr.forEach((l) => {
            if (!l || !l.id) return;
            const existing = byId.get(l.id);
            const lTs = getItemTimestamp(l);
            if (!existing) {
                byId.set(l.id, l);
                return;
            }
            const sTs = getItemTimestamp(existing);
            if (lTs > sTs) byId.set(l.id, l);
        });
        return Array.from(byId.values());
    };

    /**
     * Merge accounts so User B's save does not wipe User A's changes (e.g. new project on same account).
     * For each account id: deep-merge server + ours (ours wins for fields we send, server projects kept and merged by project id).
     */
    const mergeAccountsDeep = (serverJson, ourJson) => {
        const serverArr = Array.isArray(safeJsonParse(serverJson)) ? safeJsonParse(serverJson) : [];
        const ourArr = Array.isArray(safeJsonParse(ourJson)) ? safeJsonParse(ourJson) : [];
        const serverById = new Map(serverArr.filter((a) => a && a.id).map((a) => [a.id, a]));
        const ourIds = new Set(ourArr.map((a) => a && a.id).filter(Boolean));
        const mergedAccounts = serverArr.filter((s) => !ourIds.has(s.id));
        ourArr.forEach((ourAcc) => {
            if (!ourAcc || !ourAcc.id) return;
            const serverAcc = serverById.get(ourAcc.id);
            const serverProjects = Array.isArray(serverAcc && serverAcc.projects) ? serverAcc.projects : [];
            const ourProjects = Array.isArray(ourAcc.projects) ? ourAcc.projects : [];
            const ourProjectIds = new Set(ourProjects.map((p) => p && p.id).filter(Boolean));
            const projectsMerged = [
                ...serverProjects.filter((p) => p && !ourProjectIds.has(p.id)),
                ...ourProjects
            ];
            mergedAccounts.push({
                ...serverAcc,
                ...ourAcc,
                projects: projectsMerged
            });
        });
        return JSON.stringify(mergedAccounts);
    };

    /** Remove duplicate activities by (accountId, projectId, date day, type). Keeps last occurrence so newer/ours wins. */
    const dedupeActivitiesBySignature = (arr) => {
        if (!Array.isArray(arr) || !arr.length) return arr;
        const seen = new Map();
        arr.forEach(function (a) {
            const dateDay = (a.date || a.createdAt || '').toString().slice(0, 10);
            const sig = (a.accountId || '') + '|' + (a.projectId || '') + '|' + dateDay + '|' + (a.type || '');
            seen.set(sig, a);
        });
        return Array.from(seen.values());
    };

    /** Remove duplicate internal activities by (date day, type, activityName). */
    const dedupeInternalBySignature = (arr) => {
        if (!Array.isArray(arr) || !arr.length) return arr;
        const seen = new Map();
        arr.forEach(function (a) {
            const dateDay = (a.date || a.createdAt || '').toString().slice(0, 10);
            const sig = dateDay + '|' + (a.type || '') + '|' + (a.activityName || '');
            seen.set(sig, a);
        });
        return Array.from(seen.values());
    };

    const normalizeIsoString = (value) => {
        if (!value) return null;
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString();
        }
        const trimmed = String(value).trim();
        if (!trimmed) return null;
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed.toISOString();
    };

    const resolveActivityBucketId = (activity) => {
        const month = (activity && activity.monthOfActivity) || '';
        if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
            return `${ACTIVITY_BUCKET_PREFIX}${month}`;
        }
        const dateString =
            normalizeIsoString(activity?.date) ||
            normalizeIsoString(activity?.createdAt);
        if (!dateString) {
            return `${ACTIVITY_BUCKET_PREFIX}unknown`;
        }
        const year = dateString.slice(0, 4);
        const monthPart = dateString.slice(5, 7);
        if (!year || !monthPart) {
            return `${ACTIVITY_BUCKET_PREFIX}unknown`;
        }
        return `${ACTIVITY_BUCKET_PREFIX}${year}-${monthPart}`;
    };

    const buildActivityBuckets = (records) => {
        const buckets = new Map();
        if (!Array.isArray(records)) {
            return buckets;
        }
        records.forEach((record) => {
            const bucketKey = resolveActivityBucketId(record);
            if (!buckets.has(bucketKey)) {
                buckets.set(bucketKey, []);
            }
            buckets.get(bucketKey).push(record);
        });
        return buckets;
    };

    const loadShardManifest = (fetchKey) => {
        const response = performRequest('GET', `/${encodeURIComponent(fetchKey)}`);
        if (!response || typeof response.value !== 'string') {
            return { version: null, buckets: [] };
        }
        const raw = maybeDecompressValue(response.value);
        const parsed = safeJsonParse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return { version: null, buckets: [] };
        }
        const buckets = Array.isArray(parsed.buckets) ? parsed.buckets : [];
        return {
            version: parsed.version || null,
            buckets
        };
    };

    const saveShardManifest = (manifest) => {
        const payload = JSON.stringify({
            version: manifest.version || Date.now(),
            buckets: manifest.buckets || []
        });
        performRequest('PUT', `/${encodeURIComponent(ACTIVITIES_MANIFEST_KEY)}`, {
            value: maybeCompressValue(payload)
        });
    };

    const deleteStorageKey = (key) => {
        performRequest('DELETE', `/${encodeURIComponent(key)}`);
    };

    const saveStorageKey = (key, rawValue) => {
        performRequest('PUT', `/${encodeURIComponent(key)}`, {
            value: maybeCompressValue(rawValue)
        });
    };

    const loadActivityBucket = (bucketKey) => {
        const response = performRequest('GET', `/${encodeURIComponent(bucketKey)}`);
        if (!response || typeof response.value !== 'string') {
            return [];
        }
        const raw = maybeDecompressValue(response.value);
        const parsed = safeJsonParse(raw);
        return Array.isArray(parsed) ? parsed : [];
    };

    const composeActivitiesFromBuckets = (manifest) => {
        if (!manifest || !Array.isArray(manifest.buckets)) {
            return JSON.stringify([]);
        }
        if (
            shardCache[ACTIVITIES_KEY].value &&
            shardCache[ACTIVITIES_KEY].version === manifest.version
        ) {
            return shardCache[ACTIVITIES_KEY].value;
        }
        const aggregated = [];
        manifest.buckets.forEach((bucketKey) => {
            if (!bucketKey) return;
            const records = loadActivityBucket(bucketKey);
            if (records.length) {
                aggregated.push(...records);
            }
        });
        const serialized = JSON.stringify(aggregated);
        shardCache[ACTIVITIES_KEY] = {
            version: manifest.version,
            value: serialized
        };
        return serialized;
    };

    const ensureActivitiesPointer = () => {
        performRequest('PUT', `/${encodeURIComponent(ACTIVITIES_KEY)}`, {
            value: SHARD_POINTER_TOKEN
        });
    };

    const shardActivities = (serializedValue) => {
        const parsed = safeJsonParse(serializedValue);
        if (!Array.isArray(parsed)) {
            return false;
        }

        const existingManifest = loadShardManifest(ACTIVITIES_MANIFEST_KEY);
        const bucketMap = buildActivityBuckets(parsed);
        const bucketKeys = Array.from(bucketMap.keys()).sort((a, b) => b.localeCompare(a));

        bucketKeys.forEach((bucketKey) => {
            const records = bucketMap.get(bucketKey) || [];
            const payload = JSON.stringify(records);
            saveStorageKey(bucketKey, payload);
        });

        const staleBuckets = (existingManifest.buckets || []).filter(
            (key) => !bucketKeys.includes(key)
        );
        staleBuckets.forEach((bucketKey) => {
            deleteStorageKey(bucketKey);
        });

        const manifest = {
            version: Date.now(),
            buckets: bucketKeys
        };
        saveShardManifest(manifest);
        ensureActivitiesPointer();
        shardCache[ACTIVITIES_KEY] = {
            version: manifest.version,
            value: serializedValue
        };
        return true;
    };

    const loadActivitiesValue = () => {
        const pointerResponse = performRequest(
            'GET',
            `/${encodeURIComponent(ACTIVITIES_KEY)}`
        );
        if (!pointerResponse || typeof pointerResponse.value !== 'string') {
            return null;
        }
        const pointerValue = maybeDecompressValue(pointerResponse.value);
        if (pointerValue === SHARD_POINTER_TOKEN) {
            const manifest = loadShardManifest(ACTIVITIES_MANIFEST_KEY);
            return composeActivitiesFromBuckets(manifest);
        }
        // legacy payload
        shardCache[ACTIVITIES_KEY] = {
            version: null,
            value: pointerValue
        };
        return pointerValue;
    };

    const buildUrl = (suffix) => {
        if (!suffix) {
            return API_BASE;
        }
        if (suffix.startsWith('/')) {
            return `${API_BASE}${suffix}`;
        }
        return `${API_BASE}/${suffix}`;
    };

    /** Per-key version cache for optimistic locking (parallel / multi-tab safe). */
    const lastVersion = {};

    const buildHeaders = (extraHeaders) => {
        const headers = {
            'X-Admin-User': window.__REMOTE_STORAGE_USER__ || 'storage-proxy',
            ...extraHeaders
        };
        const extra = window.__REMOTE_STORAGE_HEADERS__;
        if (extra && typeof extra === 'object') {
            Object.keys(extra).forEach((key) => {
                const value = extra[key];
                if (value !== undefined && value !== null && value !== '') {
                    headers[key] = String(value);
                }
            });
        }
        return headers;
    };

    const performRequest = (method, suffix, body, opts) => {
        const url = buildUrl(suffix);
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, false);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Accept', 'application/json');

        let requestHeaders = {};
        const skipIfMatch = (opts && opts.skipIfMatch === true) || (typeof window !== 'undefined' && window.__REMOTE_STORAGE_RECONCILE_PUT__ === true);
        if (method === 'PUT' && suffix && suffix.startsWith('/') && !skipIfMatch) {
            const key = decodeURIComponent(suffix.replace(/^\//, ''));
            if (key && lastVersion[key] != null) {
                requestHeaders['If-Match'] = lastVersion[key];
            }
        }
        const headers = buildHeaders(requestHeaders);
        Object.keys(headers).forEach((key) => {
            xhr.setRequestHeader(key, headers[key]);
        });
        if (body !== undefined) {
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(body));
        } else {
            xhr.send();
        }

        if (xhr.status === 404) {
            return null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const result = xhr.responseText ? JSON.parse(xhr.responseText) : null;
                if (result && result.key != null && result.updated_at != null) {
                    lastVersion[result.key] = result.updated_at;
                }
                return result;
            } catch (error) {
                console.warn('Remote storage parse error', error);
                return null;
            }
        }

        if (xhr.status === 409) {
            let conflictBody = null;
            try {
                conflictBody = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            } catch (_) { }
            const error = new Error(
                conflictBody?.message || `Remote storage conflict: ${method} ${url} -> 409`
            );
            error.status = 409;
            error.conflict = true;
            error.value = conflictBody?.value;
            error.updated_at = conflictBody?.updated_at;
            throw error;
        }

        const error = new Error(
            `Remote storage request failed: ${method} ${url} -> ${xhr.status}`
        );
        error.status = xhr.status;
        throw error;
    };

    /** Async transport for Phase 2 S2.1: same contract as performRequest but returns Promise. Does not block main thread. */
    const performRequestAsync = (method, suffix, body, opts) => {
        const url = buildUrl(suffix);
        const skipIfMatch = (opts && opts.skipIfMatch === true) || (typeof window !== 'undefined' && window.__REMOTE_STORAGE_RECONCILE_PUT__ === true);
        const requestHeaders = {};
        if (method === 'PUT' && suffix && suffix.startsWith('/') && !skipIfMatch) {
            const key = decodeURIComponent(suffix.replace(/^\//, ''));
            if (key && lastVersion[key] != null) requestHeaders['If-Match'] = lastVersion[key];
        }
        const headers = { Accept: 'application/json', ...buildHeaders(requestHeaders) };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const init = { method, headers, credentials: 'include' };
        if (body !== undefined) init.body = JSON.stringify(body);
        return fetch(url, init).then((res) => {
            if (res.status === 404) return null;
            if (res.status === 401) {
                if (typeof window !== 'undefined') {
                    try {
                        // Delay so setItemAsyncWithDraft's .catch runs first and updates the draft
                        window.setTimeout(function () {
                            window.dispatchEvent(new CustomEvent('remotestorage:unauthorized', { detail: { status: 401, url } }));
                        }, 0);
                    } catch (_) { }
                }
                const err = new Error('Session expired or invalid. Please sign in again.');
                err.status = 401;
                throw err;
            }
            if (res.status >= 200 && res.status < 300) {
                return res.json().then((result) => {
                    if (result && result.key != null && result.updated_at != null) lastVersion[result.key] = result.updated_at;
                    return result;
                }).catch(() => null);
            }
            if (res.status === 409) {
                return res.json().then((conflictBody) => {
                    const err = new Error(conflictBody?.message || `Remote storage conflict: ${method} ${url} -> 409`);
                    err.status = 409;
                    err.conflict = true;
                    err.value = conflictBody?.value;
                    err.updated_at = conflictBody?.updated_at;
                    throw err;
                }).catch((e) => { if (e.status === 409) throw e; throw new Error(`Remote storage conflict: ${method} ${url} -> 409`); });
            }
            const err = new Error(`Remote storage request failed: ${method} ${url} -> ${res.status}`);
            err.status = res.status;
            throw err;
        });
    };

    /** Async get (S2.1). For 'activities' key, still uses sync load under the hood; use for non-activity keys first. */
    const getItemAsync = (key) => {
        if (!key) return Promise.resolve(null);
        if (key === ACTIVITIES_KEY) return Promise.resolve(loadActivitiesValue());
        return performRequestAsync('GET', `/${encodeURIComponent(key)}`).then((result) => {
            if (!result || typeof result.value !== 'string') return null;
            return maybeDecompressValue(result.value);
        }).catch(() => null);
    };

    /** Async set (S2.1). For accounts/internalActivities only; activities need shard path. */
    const setItemAsync = (key, value) => {
        if (!key) return Promise.reject(new Error('Key is required for setItem'));
        const payload = value === null || value === undefined ? '' : String(value);
        return performRequestAsync('PUT', `/${encodeURIComponent(key)}`, { value: maybeCompressValue(payload) }).then(() => { });
    };

    /**
     * Async set with draft: adds draft in "Submitting…" state first, then saves. On success removes draft; on failure updates draft so "Try again" / "Submit all" makes sense.
     * @param {string} key - storage key (e.g. 'accounts', 'internalActivities', 'activities')
     * @param {string|object|array} value - value to save (stringified if not string)
     * @param {{ type?: 'internal'|'external', label?: string }} options - optional type for draft
     * @returns {Promise<void>} - resolves when saved; rejects on failure (draft is updated with error, user can retry)
     */
    const setItemAsyncWithDraft = (key, value, options) => {
        const payloadStr = value === null || value === undefined ? '' : (typeof value === 'string' ? value : JSON.stringify(value));
        const { type } = options || {};
        const draftType = type || (key === 'internalActivities' ? 'internal' : 'external');
        let payloadForDraft = value;
        if (typeof payloadForDraft === 'string' && payloadForDraft) {
            try { payloadForDraft = JSON.parse(payloadForDraft); } catch (_) { }
        }
        let draft = null;
        if (typeof window !== 'undefined' && window.Drafts && typeof window.Drafts.addDraft === 'function') {
            draft = window.Drafts.addDraft({
                type: draftType,
                payload: payloadForDraft,
                errorMessage: 'Submitting…',
                storageKey: key
            });
        }
        return setItemAsync(key, payloadStr)
            .then(() => {
                if (draft && draft.id && window.Drafts && typeof window.Drafts.removeDraft === 'function') {
                    window.Drafts.removeDraft(draft.id);
                    try {
                        window.dispatchEvent(new CustomEvent('remotestorage:save-succeeded', { detail: { key } }));
                    } catch (_) { }
                }
            })
            .catch((err) => {
                const errorMessage = (err && err.status === 401)
                    ? 'Session expired. Please sign in again.'
                    : (err && err.status === 409)
                        ? 'Conflict – someone else saved. Submit again to merge.'
                        : ((err && err.message) || 'Data not saved.');
                if (draft && draft.id && window.Drafts && typeof window.Drafts.updateDraft === 'function') {
                    window.Drafts.updateDraft(draft.id, { errorMessage: errorMessage });
                } else if (typeof window !== 'undefined' && window.Drafts && typeof window.Drafts.addDraft === 'function') {
                    window.Drafts.addDraft({
                        type: draftType,
                        payload: payloadForDraft,
                        errorMessage: errorMessage,
                        storageKey: key
                    });
                }
                try {
                    window.dispatchEvent(new CustomEvent('remotestorage:save-failed', { detail: { key, error: err, message: errorMessage } }));
                } catch (_) { }
                throw err;
            });
    };

    try {
        // Probe the API before overriding the storage.
        performRequest('GET', '');
    } catch (error) {
        console.warn(
            '[RemoteStorage] Falling back to browser localStorage:',
            error.message
        );
        if (error.status === 429) {
            setTimeout(function () {
                if (typeof UI !== 'undefined' && typeof UI.showNotification === 'function') {
                    UI.showNotification('Server is busy (too many requests). Please wait a few minutes and refresh the page.', 'error');
                }
            }, 500);
        }
        window.__REMOTE_STORAGE_ENABLED__ = false;
        return;
    }

    const remoteStorage = {
        get length() {
            try {
                const result = performRequest('GET', '');
                const keys = filterVisibleKeys(result?.keys || []);
                return keys.length;
            } catch (error) {
                console.error('Remote storage length error', error);
                return 0;
            }
        },
        key(index) {
            try {
                const result = performRequest('GET', '');
                const keys = filterVisibleKeys(result?.keys || []);
                return keys[index] ?? null;
            } catch (error) {
                console.error('Remote storage key error', error);
                return null;
            }
        },
        getItem(key) {
            if (!key) return null;
            try {
                if (key === ACTIVITIES_KEY) {
                    return loadActivitiesValue();
                }
                const result = performRequest(
                    'GET',
                    `/${encodeURIComponent(key)}`
                );
                if (!result || typeof result.value !== 'string') {
                    return null;
                }
                return maybeDecompressValue(result.value);
            } catch (error) {
                console.error('Remote storage getItem error', error);
                return null;
            }
        },
        setItem(key, value) {
            if (!key) {
                throw new Error('Key is required for setItem');
            }
            let serializedValue =
                value === null || value === undefined ? '' : String(value);
            const MERGE_KEYS = ['accounts', 'internalActivities', ACTIVITIES_KEY];
            const canMergeOnConflict = MERGE_KEYS.indexOf(key) !== -1;

            const doPut = (payload) => {
                performRequest(
                    'PUT',
                    `/${encodeURIComponent(key)}`,
                    { value: maybeCompressValue(payload) }
                );
            };

            const doActivitiesSave = (payloadToSave) => {
                const toSave = payloadToSave != null ? payloadToSave : serializedValue;
                if (shardActivities(toSave)) {
                    return toSave;
                }
                return null;
            };

            const logSaveToActivityLog = (storageKey, payloadStr) => {
                try {
                    if (typeof Audit !== 'undefined' && typeof Audit.log === 'function') {
                        var count = null;
                        try {
                            var arr = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr;
                            if (Array.isArray(arr)) count = arr.length;
                        } catch (_) { }
                        Audit.log({
                            action: 'storage.save',
                            entity: 'storage',
                            entityId: storageKey,
                            detail: { key: storageKey, count: count }
                        });
                    }
                } catch (_) { }
            };

            try {
                if (key === ACTIVITIES_KEY) {
                    // Always merge with server first so a partial/stale client list never overwrites
                    const serverJson = loadActivitiesValue();
                    if (serverJson == null || serverJson === '') {
                        const err = new Error('Could not load current activities from server. Refresh the page and try again.');
                        err.code = 'REMOTE_ACTIVITIES_LOAD_FAILED';
                        throw err;
                    }
                    let mergedArr = mergeArrayByIdNewerWins(safeJsonParse(serverJson), safeJsonParse(serializedValue));
                    if (Array.isArray(mergedArr)) {
                        mergedArr = dedupeActivitiesBySignature(mergedArr);
                    }
                    let merged = JSON.stringify(mergedArr);
                    serializedValue = merged;
                    var draft = (typeof Drafts !== 'undefined' && Drafts.addDraft) ? Drafts.addDraft({
                        type: 'external',
                        payload: Array.isArray(mergedArr) ? mergedArr : safeJsonParse(merged),
                        errorMessage: 'Saving…',
                        storageKey: ACTIVITIES_KEY
                    }) : null;
                    try {
                        doActivitiesSave(merged);
                        saveLocalBackup(ACTIVITIES_KEY, merged);
                        shardCache[ACTIVITIES_KEY] = { version: null, value: serializedValue };
                        if (draft && Drafts.removeDraft) Drafts.removeDraft(draft.id);
                        logSaveToActivityLog(ACTIVITIES_KEY, merged);
                        return serializedValue;
                    } catch (e) {
                        if (draft && Drafts.updateDraft) Drafts.updateDraft(draft.id, { errorMessage: (e && e.message) || String(e) });
                        throw e;
                    }
                }
                if (canMergeOnConflict) {
                    const serverValue = this.getItem(key);
                    let serverStr = typeof serverValue === 'string' ? serverValue : JSON.stringify(serverValue || []);
                    if (key === 'internalActivities') {
                        const serverArr = safeJsonParse(serverStr);
                        const ourArr = safeJsonParse(serializedValue);
                        const serverEmpty = !serverArr || !Array.isArray(serverArr) || serverArr.length === 0;
                        const ourHasItems = Array.isArray(ourArr) && ourArr.length > 0;
                        if (serverEmpty && ourHasItems) {
                            const err = new Error('Could not load internal activities from server. Refresh the page and try again.');
                            err.code = 'REMOTE_INTERNAL_ACTIVITIES_LOAD_FAILED';
                            throw err;
                        }
                    }
                    if (key === 'accounts' || key === 'internalActivities') {
                        serverStr = applyBackupRecovery(key, serverStr);
                    }
                    let merged = key === 'accounts'
                        ? mergeAccountsDeep(serverStr, serializedValue)
                        : JSON.stringify(mergeArrayByIdNewerWins(safeJsonParse(serverStr), safeJsonParse(serializedValue)));
                    var mergedArr = safeJsonParse(merged);
                    if (Array.isArray(mergedArr) && key === 'internalActivities') {
                        mergedArr = dedupeInternalBySignature(mergedArr);
                        merged = JSON.stringify(mergedArr);
                    } else if (Array.isArray(mergedArr)) {
                        merged = JSON.stringify(mergedArr);
                    }
                    serializedValue = merged;
                    var draftAcc = (typeof Drafts !== 'undefined' && Drafts.addDraft) ? Drafts.addDraft({
                        type: key === 'internalActivities' ? 'internal' : 'external',
                        payload: Array.isArray(mergedArr) ? mergedArr : safeJsonParse(merged),
                        errorMessage: 'Saving…',
                        storageKey: key
                    }) : null;
                    try {
                        doPut(merged);
                        saveLocalBackup(key, merged);
                        if (draftAcc && Drafts.removeDraft) Drafts.removeDraft(draftAcc.id);
                        logSaveToActivityLog(key, merged);
                        return serializedValue;
                    } catch (e) {
                        if (draftAcc && Drafts.updateDraft) Drafts.updateDraft(draftAcc.id, { errorMessage: (e && e.message) || String(e) });
                        throw e;
                    }
                }
                doPut(serializedValue);
                logSaveToActivityLog(key, serializedValue);
                return serializedValue;
            } catch (error) {
                if (error.status === 409 && error.conflict && canMergeOnConflict) {
                    let merged;
                    if (key === ACTIVITIES_KEY) {
                        const serverJson409 = loadActivitiesValue();
                        let mergedArr = mergeArrayByIdNewerWins(safeJsonParse(serverJson409), safeJsonParse(serializedValue));
                        mergedArr = dedupeActivitiesBySignature(mergedArr);
                        merged = JSON.stringify(mergedArr);
                        serializedValue = merged;
                        doActivitiesSave(merged);
                        saveLocalBackup(ACTIVITIES_KEY, serializedValue);
                    } else {
                        const serverVal409 = this.getItem(key);
                        let serverStr409 = typeof serverVal409 === 'string' ? serverVal409 : JSON.stringify(serverVal409 || []);
                        if (key === 'accounts' || key === 'internalActivities') {
                            serverStr409 = applyBackupRecovery(key, serverStr409);
                        }
                        merged = key === 'accounts'
                            ? mergeAccountsDeep(serverStr409, serializedValue)
                            : JSON.stringify(mergeArrayByIdNewerWins(safeJsonParse(serverStr409), safeJsonParse(serializedValue)));
                        doPut(merged);
                        serializedValue = merged;
                        saveLocalBackup(key, serializedValue);
                    }
                    if (key === ACTIVITIES_KEY) {
                        shardCache[ACTIVITIES_KEY] = {
                            version: null,
                            value: serializedValue
                        };
                    }
                    logSaveToActivityLog(key === ACTIVITIES_KEY ? ACTIVITIES_KEY : key, serializedValue);
                    return serializedValue;
                }
                console.error('Remote storage setItem error', error);
                throw error;
            }
        },
        removeItem(key) {
            if (!key) return;
            try {
                if (key === ACTIVITIES_KEY) {
                    const manifest = loadShardManifest(ACTIVITIES_MANIFEST_KEY);
                    (manifest.buckets || []).forEach((bucketKey) => {
                        deleteStorageKey(bucketKey);
                    });
                    deleteStorageKey(ACTIVITIES_MANIFEST_KEY);
                    deleteStorageKey(ACTIVITIES_KEY);
                    shardCache[ACTIVITIES_KEY] = {
                        version: null,
                        value: null
                    };
                    return;
                }
                performRequest('DELETE', `/${encodeURIComponent(key)}`);
            } catch (error) {
                console.error('Remote storage removeItem error', error);
            }
        },
        clear() {
            try {
                performRequest('DELETE', '');
                Object.keys(shardCache).forEach((cacheKey) => {
                    shardCache[cacheKey] = { version: null, value: null };
                });
            } catch (error) {
                console.error('Remote storage clear error', error);
            }
        }
    };

    /** On login: merge server + local backup (newer wins), add missing, dedupe, then PUT so drift is fixed. */
    /** Uses skipIfMatch so reconcile PUTs don't get 409 (intent is to push merged state). Per-key try/catch so one failure doesn't block the rest. */
    const reconcileOnLogin = async () => {
        if (typeof window !== 'undefined') {
            window.__REMOTE_STORAGE_RECONCILE_PUT__ = true;
            try {
                window.dispatchEvent(new CustomEvent('remotestorage:reconcile-start'));
            } catch (_) { }
        }
        try {
            await reconcileOnLoginImpl();
        } finally {
            if (typeof window !== 'undefined') {
                window.__REMOTE_STORAGE_RECONCILE_PUT__ = false;
                try {
                    window.dispatchEvent(new CustomEvent('remotestorage:reconcile-end'));
                } catch (_) { }
            }
        }
    };
    const reconcileOnLoginImpl = async () => {
        const keys = ['internalActivities', 'accounts'];
        // Process keys sequentially to avoid overwhelming the server
        for (const key of keys) {
            try {
                // Use async getItemAsync if available, fallback to sync
                let serverRaw;
                if (typeof getItemAsync === 'function') {
                    serverRaw = await getItemAsync(key);
                } else {
                    serverRaw = remoteStorage.getItem(key);
                }
                const localRaw = getLocalBackup(key);
                const serverArr = safeJsonParse(serverRaw);
                const localArr = safeJsonParse(localRaw);
                const serverA = Array.isArray(serverArr) ? serverArr : [];
                const localA = Array.isArray(localArr) ? localArr : [];
                let merged = mergeArrayByIdNewerWins(serverA, localA);
                if (key === 'internalActivities' && merged.length) {
                    merged = dedupeInternalBySignature(merged);
                }
                if (merged.length === 0 && serverA.length === 0 && localA.length === 0) continue;
                const payload = JSON.stringify(merged);
                // Use async setItemAsync if available, fallback to sync
                if (typeof setItemAsync === 'function') {
                    await setItemAsync(key, maybeCompressValue(payload));
                } else {
                    performRequest('PUT', `/${encodeURIComponent(key)}`, { value: maybeCompressValue(payload) });
                }
                saveLocalBackup(key, payload);
                if (typeof console !== 'undefined' && console.log) {
                    console.log('[RemoteStorage] Reconcile on login: ' + key + ' merged to ' + merged.length + ' items.');
                }
            } catch (err) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('[RemoteStorage] Reconcile on login failed for ' + key + ':', err.message);
                }
            }
        }
        try {
            // Use async getItemAsync for activities if available, fallback to sync
            let serverActivities;
            if (typeof getItemAsync === 'function') {
                serverActivities = await getItemAsync(ACTIVITIES_KEY);
            } else {
                serverActivities = loadActivitiesValue();
            }
            const localActivitiesRaw = getLocalBackup(ACTIVITIES_KEY);
            const serverAct = safeJsonParse(serverActivities);
            const localAct = safeJsonParse(localActivitiesRaw);
            const serverArr = Array.isArray(serverAct) ? serverAct : [];
            const localArr = Array.isArray(localAct) ? localAct : [];
            let mergedAct = mergeArrayByIdNewerWins(serverArr, localArr);
            if (mergedAct.length) mergedAct = dedupeActivitiesBySignature(mergedAct);
            if (mergedAct.length > 0) {
                const mergedStr = JSON.stringify(mergedAct);
                if (shardActivities(mergedStr)) {
                    // Activities need special sharding path - use the existing shard save logic
                    // Note: setItemAsync doesn't handle activities sharding, so we use the sync path for now
                    // In future, we could make a setItemAsyncActivities that handles sharding
                    const doActivitiesSave = (payload) => {
                        if (shardActivities(payload)) {
                            saveLocalBackup(ACTIVITIES_KEY, payload);
                            shardCache[ACTIVITIES_KEY] = { version: null, value: payload };
                        }
                    };
                    doActivitiesSave(mergedStr);
                    saveLocalBackup(ACTIVITIES_KEY, mergedStr);
                    if (typeof console !== 'undefined' && console.log) {
                        console.log('[RemoteStorage] Reconcile on login: activities merged to ' + mergedAct.length + ' items.');
                    }
                }
            }
        } catch (err) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('[RemoteStorage] Reconcile on login failed for activities:', err.message);
            }
        }
        if (typeof DataManager !== 'undefined' && DataManager.cache) {
            DataManager.cache.activities = null;
            DataManager.cache.accounts = null;
            DataManager.cache.internalActivities = null;
            DataManager.cache.allActivities = null;
        }
    };

    try {
        Object.defineProperty(window, 'localStorage', {
            value: remoteStorage,
            configurable: true,
            enumerable: false,
            writable: false
        });
        window.__REMOTE_STORAGE_ENABLED__ = true;
        window.__BROWSER_LOCAL_STORAGE__ = originalLocalStorage;
        window.__REMOTE_STORAGE_RECONCILE__ = reconcileOnLogin;
        window.__REMOTE_STORAGE_ASYNC__ = { getItemAsync, setItemAsync, setItemAsyncWithDraft, performRequestAsync };
    } catch (error) {
        console.error(
            '[RemoteStorage] Failed to install remote storage proxy:',
            error
        );
        window.__REMOTE_STORAGE_ENABLED__ = false;
    }
})();

