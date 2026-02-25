# Step-by-step: Run DB cleanup (with or without Railway CLI)

You can either **trigger cleanup from the app** (no CLI) or **use Railway CLI** on your computer.

---

## Option A: From the app (no Railway CLI)

Use this if you don’t have or don’t want to use the Railway CLI. You must be logged in as an **admin**.

### Step 1: Deploy the latest code

The app now has an admin cleanup API. Deploy your project to Railway as usual (push to Git if Railway deploys from GitHub, or deploy from your IDE).

### Step 2: Log in as admin

1. Open your app in the browser (e.g. `https://your-app.up.railway.app`).
2. Log in with an **admin** account.

### Step 3: Run cleanup (delete all data before June 2025)

Use one of these:

**3a) From the browser (any tool that can send a POST request)**

Open the **Developer Console** (F12 → Console), then paste and run:

```javascript
fetch('/api/admin/cleanup', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deleteBeforeDate: '2025-06-01' })
}).then(r => r.json()).then(console.log).catch(console.error);
```

You should see a response like:  
`{ ok: true, login_logs: 123, activity_logs: 456, storage_history: 789, total: 1368, mode: "before 2025-06-01" }`

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

Use this if you want to run the cleanup from your machine with Railway’s environment (e.g. to use the same scripts that run locally with `DATABASE_URL` from Railway).

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
2. Go to your project folder:

   ```powershell
   cd "c:\Project PAT Master Folder\Project PAT"
   ```

3. Log in and link:

   ```powershell
   railway login
   railway link
   ```

   When you run `railway link`, choose the right **project** and **environment** (e.g. production) that has your Postgres database.

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
