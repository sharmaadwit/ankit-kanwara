# Railway 404 troubleshooting

If **https://ankit-kanwara-production.up.railway.app/** (or `/api/health`) returns **404**:

## 1. Check the app is running

- **Railway dashboard** → your project → **Deployments** → latest deployment → **View logs**.
- You should see:
  - `server_listening` with a `port` (e.g. 8080).
  - `db_init_succeeded`.
  - (After latest deploy) `static_configured` with `staticDir`, `staticDirExists`, `indexExists`, `cwd`.
- If you see **no logs** or the process exits (e.g. crash), the 404 is because **no app is listening**; Railway returns 404 when no service handles the request.

### Logs show “server_listening” but you still get 404

If logs show the app **starting** (`cors_origins_configured`, `server_listening`, `db_init_succeeded`) and then **SIGTERM** / “Stopping Container” a few seconds later:

- Railway is **stopping the container** (e.g. redeploy or **health check failure**). If the **health check** gets a non-200 (e.g. 404 or 503), Railway can treat the service as unhealthy and stop or replace it, so users see 404.
- **Fix:** Set the service **health check path** to an endpoint that returns **200** when the app is ready. This app uses **`/api/health`** (returns 200 when DB is reachable). The repo includes **`railway.toml`** with `healthcheckPath = "/api/health"` and a grace period so DB init can finish first. If your project doesn’t use the file, set it in Railway: **Service → Settings → Health Check → Path:** `/api/health`, and a **grace period** of at least 30–45 seconds.

## 2. Common causes

| Cause | What to do |
|-------|------------|
| **Build failed** | Check **Build** logs in Railway. Fix build errors (e.g. missing dependency, wrong Node version). |
| **App crashes on startup** | Check **Deploy** logs. Often `DATABASE_URL` missing or wrong, or DB unreachable. Add/fix env vars in Railway → **Variables**. |
| **Wrong root directory** | Repo root must contain `package.json`, `server/`, and `pams-app/`. If your repo root is a parent folder, set Railway **Settings** → **Root Directory** to the subfolder that has these (e.g. `Project PAT`). |
| **Wrong service** | If you have multiple services, open the URL of the **web** service that runs `npm start` (Procfile: `web: npm start`). |

## 3. After a code fix

- Push to `main` and wait for Railway to rebuild and redeploy.
- In logs, confirm `static_configured` shows `staticDirExists: true` and `indexExists: true`. If not, the build is not including `pams-app/` or the working directory is wrong.

## 4. Quick health check

When the app is running, these should **not** return 404:

- `https://ankit-kanwara-production.up.railway.app/` → HTML (login/app).
- `https://ankit-kanwara-production.up.railway.app/api/health` → `{"status":"ok"}`.
- `https://ankit-kanwara-production.up.railway.app/api/version` → `{"version":"...","buildId":"..."}`.

If `/` works but `/api/health` is 404, the static app is being served but API routes may be misconfigured. If nothing works, the process is likely not running (see step 1).
