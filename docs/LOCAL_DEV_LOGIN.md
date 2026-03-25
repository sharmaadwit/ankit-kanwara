# Local dev login (`dev` / `dev`)

When the database is not available (or you only need the UI), you can sign in with:

| Field    | Value |
|----------|--------|
| Username | `dev`  |
| Password | `dev`  |

## Requirements

1. **`NODE_ENV` must not be `production`** (default when you run `npm start` locally).
2. **`ALLOW_DEV_LOGIN=true`** must be set for the Node process.

## Easiest: use the dev start script

From the **Project PAT** folder (where `package.json` is):

```bash
npm run start:dev
```

Then open http://localhost:8080 and log in with **dev** / **dev**.

## Alternative: `.env`

In `Project PAT/.env` (copy from `server/env.sample` if needed), add:

```env
ALLOW_DEV_LOGIN=true
```

Then run:

```bash
npm start
```

## Production

On Railway/hosted apps, `NODE_ENV` is `production`, so **dev login is disabled** even if `ALLOW_DEV_LOGIN` were set.

## If login still fails

- Restart the server after changing env vars.
- Confirm you see no `NODE_ENV=production` in your shell when running locally.
- `/api/auth/login` returning **500** usually means the request reached DB code — with dev login enabled, **dev** / **dev** is handled **before** the database, so you should get **200**. If you still get 500, check the server console and that `npm run start:dev` was used (or `ALLOW_DEV_LOGIN=true` is set).
