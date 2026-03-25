# Testing: Admin mode visibility (`admin`)

## What it controls

- **System Admin** and **Configuration** sidebar entries both use `data-dashboard="admin"`.
- `getDashboardVisibilityKey('systemAdmin' | 'configuration')` → `'admin'` for access checks.

## Enable

Matrix row **Admin Mode** ON.

## Verify (on)

- **System Admin** and **Configuration** visible to admin users (subject to role).

## Verify (off)

- Both entries **hidden**; `switchView('systemAdmin' | 'configuration')` blocked.

## Recovery

If this is turned off by mistake, restore via admin API / server config / DB — the UI cannot be used to fix it. See [README.md](./README.md).
