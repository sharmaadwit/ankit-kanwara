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

    const buildUrl = (suffix) => {
        if (!suffix) {
            return API_BASE;
        }
        if (suffix.startsWith('/')) {
            return `${API_BASE}${suffix}`;
        }
        return `${API_BASE}/${suffix}`;
    };

    const performRequest = (method, suffix, body) => {
        const url = buildUrl(suffix);
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, false);
        xhr.setRequestHeader('Accept', 'application/json');
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
                return Array.isArray(result?.keys) ? result.keys.length : 0;
            } catch (error) {
                console.error('Remote storage length error', error);
                return 0;
            }
        },
        key(index) {
            try {
                const result = performRequest('GET', '');
                if (!Array.isArray(result?.keys)) return null;
                return result.keys[index] ?? null;
            } catch (error) {
                console.error('Remote storage key error', error);
                return null;
            }
        },
        getItem(key) {
            if (!key) return null;
            try {
                const result = performRequest(
                    'GET',
                    `/${encodeURIComponent(key)}`
                );
                if (!result || typeof result.value !== 'string') {
                    return null;
                }
                return result.value;
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
                performRequest(
                    'PUT',
                    `/${encodeURIComponent(key)}`,
                    {
                        value: serializedValue
                    }
                );
                return serializedValue;
            } catch (error) {
                console.error('Remote storage setItem error', error);
                throw error;
            }
        },
        removeItem(key) {
            if (!key) return;
            try {
                performRequest('DELETE', `/${encodeURIComponent(key)}`);
            } catch (error) {
                console.error('Remote storage removeItem error', error);
            }
        },
        clear() {
            try {
                performRequest('DELETE', '');
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

