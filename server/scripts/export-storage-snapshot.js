#!/usr/bin/env node

/**
 * Exports a snapshot of the hosted storage into the local `backups/` directory.
 *
 * Usage:
 *   REMOTE_STORAGE_BASE="https://<service>.up.railway.app/api/storage" node server/scripts/export-storage-snapshot.js
 *
 * Optional environment variables:
 *   REMOTE_STORAGE_USER    -> value for X-Admin-User header
 *   REMOTE_STORAGE_HEADERS -> JSON object of extra headers to send with each request
 *   SNAPSHOT_DIR           -> override output directory (defaults to backups/)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const {
    decompressFromBase64
} = require('../../pams-app/js/vendor/lz-string.js');

const resolveFetch = async () => {
    if (typeof fetch === 'function') {
        return fetch;
    }
    try {
        const { default: nodeFetch } = await import('node-fetch');
        return nodeFetch;
    } catch (error) {
        throw new Error('Global fetch API is not available. Install "node-fetch" or upgrade to Node 18+.'); // eslint-disable-line max-len
    }
};

const normalizeBase = (value) => {
    if (!value) return '';
    let trimmed = String(value).trim();
    while (trimmed.endsWith('/')) {
        trimmed = trimmed.slice(0, -1);
    }
    return trimmed;
};

const buildHeaders = () => {
    const headers = {
        Accept: 'application/json'
    };
    if (process.env.REMOTE_STORAGE_USER) {
        headers['X-Admin-User'] = process.env.REMOTE_STORAGE_USER;
    }
    if (process.env.REMOTE_STORAGE_HEADERS) {
        try {
            const parsed = JSON.parse(process.env.REMOTE_STORAGE_HEADERS);
            Object.entries(parsed).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    headers[key] = String(value);
                }
            });
        } catch (error) {
            console.warn('Unable to parse REMOTE_STORAGE_HEADERS. Expected JSON object.', error);
        }
    }
    return headers;
};

const decodeValue = (value) => {
    if (typeof value !== 'string') {
        return value;
    }
    if (value.startsWith('__lz__')) {
        try {
            const decoded = decompressFromBase64(value.slice('__lz__'.length));
            return decoded;
        } catch (error) {
            console.warn('Failed to LZ decompress payload. Returning raw string.');
            return value;
        }
    }
    if (value.startsWith('__gz__')) {
        try {
            const buffer = Buffer.from(value.slice('__gz__'.length), 'base64');
            return zlib.gunzipSync(buffer).toString('utf8');
        } catch (error) {
            console.warn('Failed to gunzip payload. Returning raw string.');
            return value;
        }
    }
    return value;
};

const writeSnapshot = (filePath, payload) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
};

const fetchKeyList = async (base, fetchImpl, headers) => {
    const response = await fetchImpl(base, { headers });
    if (!response.ok) {
        throw new Error(`Failed to fetch key list: ${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    if (Array.isArray(payload)) {
        return payload;
    }
    if (payload && typeof payload === 'object' && Array.isArray(payload.keys)) {
        return payload.keys;
    }
    throw new Error('Unexpected response when listing storage keys.');
};

const fetchValue = async (base, key, fetchImpl, headers) => {
    const response = await fetchImpl(`${base}/${encodeURIComponent(key)}`, { headers });
    if (!response.ok) {
        if (response.status === 404) {
            return null;
        }
        throw new Error(`Failed to fetch key "${key}": ${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const decoded = decodeValue(payload.value);
    if (typeof decoded === 'string') {
        try {
            return JSON.parse(decoded);
        } catch (error) {
            return decoded;
        }
    }
    return decoded;
};

const main = async () => {
    const baseFromEnv = normalizeBase(process.env.REMOTE_STORAGE_BASE);
    const baseFromArg = normalizeBase(process.argv[2]);
    const base = baseFromEnv || baseFromArg;

    if (!base) {
        console.error('⚠️  Provide the storage base via REMOTE_STORAGE_BASE env var or as the first argument.'); // eslint-disable-line max-len
        process.exit(1);
    }

    const fetchImpl = await resolveFetch();
    const headers = buildHeaders();

    console.log(`⇢ Fetching key listing from ${base}`);
    const keys = await fetchKeyList(base, fetchImpl, headers);
    console.log(`ℹ️  Found ${keys.length} keys.`);

    const snapshot = {
        generatedAt: new Date().toISOString(),
        source: base,
        totalKeys: keys.length,
        data: {}
    };

    for (const key of keys) {
        process.stdout.write(`   ↳ ${key} ... `);
        try {
            const value = await fetchValue(base, key, fetchImpl, headers);
            snapshot.data[key] = value;
            console.log('ok');
        } catch (error) {
            console.log(`failed (${error.message})`);
            snapshot.data[key] = {
                error: error.message
            };
        }
    }

    const outputDir = process.env.SNAPSHOT_DIR
        ? path.resolve(process.env.SNAPSHOT_DIR)
        : path.join(__dirname, '..', '..', 'backups');
    const fileName = `storage-snapshot-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.json`;
    const outputPath = path.join(outputDir, fileName);

    writeSnapshot(outputPath, snapshot);
    console.log(`✅ Snapshot written to ${path.relative(process.cwd(), outputPath)}`);
};

main().catch((error) => {
    console.error('Unexpected error while exporting storage snapshot:', error);
    process.exit(1);
});
