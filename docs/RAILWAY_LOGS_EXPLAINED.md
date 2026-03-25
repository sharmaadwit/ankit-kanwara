# Railway logs explained

What you see in Railway logs and whether it needs action.

---

## 1. Postgres: “checkpoint starting” / “checkpoint complete”

- **What it is:** Normal PostgreSQL background checkpoints (flushing dirty buffers to disk).
- **Why “error”?** Railway (or the Postgres image) often sends all Postgres `LOG` output to stderr, so it appears as “error” level. The messages themselves are informational.
- **Action:** None. If checkpoints often take a long time (e.g. `write=61.347 s`), that’s usually due to disk I/O on the plan (shared/network storage). Running cleanup/VACUUM and keeping DB size down helps.

---

## 2. App: “npm error … signal SIGTERM” / “command sh -c node server/index.js”

- **What it is:** Railway is stopping the app (e.g. redeploy, scale-down, new release). The process receives SIGTERM and exits.
- **Action:** None. This is expected during deploys.

---

## 3. App: “npm warn config production Use `--omit=dev` instead”

- **What it is:** npm warning about the deprecated `--production` flag.
- **Action:** Optional: in Railway build command or `package.json` scripts, use `npm ci --omit=dev` (or `npm install --omit=dev`) instead of `npm install --production` to clear the warning.

---

## 4. Postgres: “could not receive data from client: Connection reset by peer”

- **What it is:** The client (your Node app or a connection pool) closed the connection (e.g. app restarted, deploy, timeout).
- **Action:** None for occasional occurrences. If it’s very frequent, check for connection leaks or overly short timeouts.

---

## 5. Postgres: “received direct SSL connection request without ALPN protocol negotiation extension”

- **What it is:** Something connected to the Postgres port with SSL but without ALPN (e.g. old client, scanner, or non-Postgres tool).
- **Action:** None unless you’re locking down who can reach the DB. Often harmless.

---

## 6. App: “Bad uncompressed size: 1053 != 0” (and similar)

- **What it is:** When reading a storage value that starts with `__gz__`, the server tries to decompress it (gzip). Node’s zlib throws “Bad uncompressed size” when the gzip trailer (stored length) doesn’t match the actual decompressed length — e.g. truncated/corrupt gzip or data that isn’t gzip but was stored with the `__gz__` prefix.
- **What we do:** Decompression is in a try/catch; on failure we log and return the raw value so the request doesn’t crash. The client may get a value that isn’t valid JSON if the raw value is still the compressed blob.
- **Action:** No immediate fix required. If you see many of these for the same key, that key’s value may be corrupt; re-saving that entity (or re-running recompress for that key type) can fix it. You can ignore occasional occurrences.

---

## Summary

| Log | Meaning | Action |
|-----|--------|--------|
| checkpoint starting/complete | Normal Postgres checkpoints | None |
| npm error SIGTERM / command failed | App stopped during deploy | None |
| npm warn --omit=dev | Deprecated npm flag | Optional: use `--omit=dev` |
| Connection reset by peer | Client closed DB connection | None (or check leaks if frequent) |
| SSL without ALPN | Non-standard connection to DB | None |
| Bad uncompressed size | Decompress failed for one value; we fall back to raw | None (or fix that key if persistent) |
