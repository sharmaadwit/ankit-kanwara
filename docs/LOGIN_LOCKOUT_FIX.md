# Login / lockout issues – cause and fix

## What was going wrong

Many users (including you) were getting **locked out** or **unable to log in** because of **rate limiting**.

1. **Storage is rate limited**  
   The `/api/storage` routes (used to load users, accounts, activities, etc.) are limited to a number of requests per 15 minutes per **client IP**.

2. **Behind Railway, everyone looked like one IP**  
   The rate limiter was configured with `validate: { trustProxy: false }`.  
   So it did **not** use the real client IP from `X-Forwarded-For` and instead saw the **proxy’s IP**.  
   Result: **all users shared a single “IP”** and a single 15‑minute quota (e.g. 150 requests).

3. **One quota for the whole team**  
   Each page load triggers many storage requests (users, accounts, activities, config, etc.).  
   After a few people loaded the app or refreshed, the shared quota was used up.  
   New requests then got **429 Too many requests** → storage failed → **no user list** → **login failed** or app looked broken (“locked out”).

## What we changed

1. **Trust the proxy for rate limiting**  
   We removed `validate: { trustProxy: false }` from the storage (and admin) rate limiters.  
   With `app.set('trust proxy', true)` already set, the app now uses the **real client IP** from `X-Forwarded-For`.  
   So **each user has their own quota** (e.g. 300 storage requests per 15 minutes per user), and one user or office no longer exhausts the limit for everyone.

2. **Slightly higher default storage limit**  
   Default storage limit was raised from 150 to **300** requests per 15 minutes per IP, so normal use (including login and loading the app) is less likely to hit the limit even for heavy users.

3. **Clearer 429 message**  
   The message returned on 429 was updated to:  
   `"Too many requests; please wait a few minutes and try again."`

## What you should do

1. **Deploy** the change (push to `main` so Railway redeploys).
2. **If someone is still “locked out” right now**  
   They (or that IP) are still inside the current 15‑minute window.  
   - Either wait **about 15 minutes** and try again, or  
   - Deploy the fix; after deploy, each user gets their own quota so the lockout should stop.
3. **Optional**  
   To raise the limit further, set in Railway (or `.env`):  
   `RATE_LIMIT_STORAGE_MAX=500` (or higher).

## Summary

- **Cause:** Rate limiter treated all users as one IP (proxy), so the whole team shared one small request quota → 429 → no storage → login/lockout.
- **Fix:** Rate limit by real client IP (trust proxy) and a higher default limit so each user has their own quota and login works again.
