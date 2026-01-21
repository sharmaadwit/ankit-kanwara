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

    const buildHeaders = () => {
        const headers = {
            'X-Admin-User': window.__REMOTE_STORAGE_USER__ || 'storage-proxy'
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

    const performRequest = (method, suffix, body) => {
        const url = buildUrl(suffix);
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, false);
        xhr.setRequestHeader('Accept', 'application/json');
        const headers = buildHeaders();
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
                return xhr.responseText ? JSON.parse(xhr.responseText) : null;
            } catch (error) {
                console.warn('Remote storage parse error', error);
                return null;
            }
        }

        const error = new Error(
            `Remote storage request failed: ${method} ${url} -> ${xhr.status}`
        );
        error.status = xhr.status;
        throw error;
    };

    try {
        // Probe the API before overriding the storage.
        performRequest('GET', '');
    } catch (error) {
        console.warn(
            '[RemoteStorage] Falling back to browser localStorage:',
            error.message
        );
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
            const serializedValue =
                value === null || value === undefined ? '' : String(value);
            try {
                if (key === ACTIVITIES_KEY && shardActivities(serializedValue)) {
                    return serializedValue;
                }
                performRequest(
                    'PUT',
                    `/${encodeURIComponent(key)}`,
                    {
                        value: maybeCompressValue(serializedValue)
                    }
                );
                if (key === ACTIVITIES_KEY) {
                    shardCache[ACTIVITIES_KEY] = {
                        version: null,
                        value: serializedValue
                    };
                }
                return serializedValue;
            } catch (error) {
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

    try {
        Object.defineProperty(window, 'localStorage', {
            value: remoteStorage,
            configurable: true,
            enumerable: false,
            writable: false
        });
        window.__REMOTE_STORAGE_ENABLED__ = true;
        window.__BROWSER_LOCAL_STORAGE__ = originalLocalStorage;
    } catch (error) {
        console.error(
            '[RemoteStorage] Failed to install remote storage proxy:',
            error
        );
        window.__REMOTE_STORAGE_ENABLED__ = false;
    }
})();

