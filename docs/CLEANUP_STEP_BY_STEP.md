# Step-by-step: Run DB cleanup (with or without Railway CLI)

You can either **trigger cleanup from the app** (no CLI) or **use Railway CLI** on your computer.

**If you get “connection timeout” or “ENOTFOUND postgres.railway.internal”** when using Railway CLI, the DB is only reachable from inside Railway. Use **Option A (browser)** instead — it always works.

---

## Option A: From the app (no Railway CLI)

Use this if you don’t have or don’t want to use the Railway CLI. You must be logged in as an **admin**.

**Critical:** Run the cleanup fetch **only when the address bar shows your app URL** (e.g. `https://ankit-kanwara-production.up.railway.app`). If you run it while on **railway.com** (the Railway dashboard), the request goes to Railway’s site and you get **404** — the cleanup runs on your app, not on Railway’s website.

### Step 1: Deploy the latest code

The app now has an admin cleanup API. Deploy your project to Railway as usual (push to Git if Railway deploys from GitHub, or deploy from your IDE).

### Step 2: Open your app and log in (so the server has your session)

1. In the **address bar**, go to **your app URL**: `https://ankit-kanwara-production.up.railway.app` (not railway.com).
2. If you see the login screen, log in with your **admin** account.
3. If you’re already on the dashboard but the console showed **401** on `/api/auth/me`, the server does **not** have a valid session cookie. **Log out**, then **log in again** so the server sets the cookie. Then run the cleanup in Step 3.

### Step 3: Run cleanup (delete all data before June 2025)

Use one of these:

**3a) From the browser (any tool that can send a POST request)**

Open the **Developer Console** (F12 → Console). Paste **only this one line** (do not include any \`\`\` or “javascript” text). This sends your current username so the server can verify you’re an admin:

```
fetch('/api/admin/cleanup',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Admin-User':(typeof Auth!=='undefined'&&Auth.currentUser&&Auth.currentUser.username)?Auth.currentUser.username:''},body:JSON.stringify({deleteBeforeDate:'2025-06-01'})}).then(r=>r.json()).then(console.log).catch(console.error);
```

Press Enter. You should see a response like:  
`{ ok: true, login_logs: 123, activity_logs: 456, storage_history: 789, total: 1368, mode: "before 2025-06-01" }`

**Important:** Be on **your app’s tab** (URL like `…up.railway.app`), **logged in as admin**, and use the line above (it includes `X-Admin-User` so the server can verify your admin role even when the session cookie isn’t set). If you still get **401**, your user must exist in the database with the **Admin** role (log in once via the login form so your user is in the DB).

**3b) From PowerShell or curl**

If you have an admin session cookie, you can call the API from the command line. Easiest is **3a**: use the same browser where you’re logged in, F12 → Console → paste the `fetch(...)` → Enter.

### Step 4: Optional — run “retention” cleanup later

To only delete old data by age (e.g. keep last 90 days), call the same URL **without** a date:

```javascript
fetch('/api/admin/cleanup', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
}).then(r => r.json()).then(console.log);
```

---

## Option B: Using Railway CLI

**Note:** Railway’s `DATABASE_URL` often points to `postgres.railway.internal`, which **only works inside Railway**. So `railway run npm run cleanup-before-june2025` from your PC may fail with “connection timeout” or “ENOTFOUND postgres.railway.internal”. **Use Option A (browser)** instead — it always works because the cleanup runs on the server.

### Step 1: Check if Railway CLI is installed

Open **PowerShell** or **Command Prompt** and run:

```text
railway --version
```

- If you see a version number, go to **Step 3**.
- If you get “command not found” or an error, go to **Step 2**.

### Step 2: Install Railway CLI

**Option 2a — npm (if you have Node.js):**

```powershell
npm install -g @railway/cli
```

**Option 2b — Windows (winget):**

```powershell
winget install Railway.Railway
```

**Option 2c — Download:**

1. Open: https://docs.railway.app/develop/cli  
2. Download the Windows installer or standalone executable.  
3. Install or add it to your PATH.

Then run `railway --version` again to confirm.

### Step 3: Link your project (once)

1. Open PowerShell or Command Prompt.
2. **Go into the app folder** (where `package.json` lives — not the parent folder):

   ```powershell
   cd "c:\Project PAT Master Folder\Project PAT"
   ```

3. Log in and link:

   ```powershell
   railway login
   railway link
   ```

   When you run `railway link`, choose the right **project** and **environment** (e.g. production). You can select your **app service** (or press Esc at “Select a service” to use project-level env vars). The scripts need `DATABASE_URL`, which is usually available from the project.

### Step 4: Run the size report (optional)

See what’s using disk:

```powershell
railway run npm run db-size-report
```

### Step 5: Run cleanup (delete all data before June 2025)

```powershell
railway run npm run cleanup-before-june2025
```

Or with the date in the environment:

```powershell
$env:DELETE_BEFORE_DATE = "2025-06-01"
railway run node server/scripts/cleanup-logs-and-history.js
```

You should see lines like:

- `login_logs: deleted X (before 2025-06-01)`
- `activity_logs: deleted X (before 2025-06-01)`
- `storage_history: deleted X (before 2025-06-01)`
- `VACUUM done.`

---

## Summary

| Goal                         | No CLI (Option A)                                                                 | With CLI (Option B)                    |
|-----------------------------|------------------------------------------------------------------------------------|----------------------------------------|
| Delete data before Jun 2025| Log in as admin → F12 → Console → run the `fetch('/api/admin/cleanup', ...)` call above | `railway run npm run cleanup-before-june2025` |
| See what’s using disk      | —                                                                                  | `railway run npm run db-size-report`   |

**Easiest path if you don’t have Railway CLI:** deploy, log in as admin, open F12 → Console, paste and run the first `fetch(...)` from **Step 3a** in Option A.
