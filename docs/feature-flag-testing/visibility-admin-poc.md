# Testing: Sandbox / POC admin (`adminPoc`)

## What it controls

**Sandbox Access** visibility for admins (`adminPoc` in `getDashboardVisibilityKey` for legacy `adminPoc` view).

## Enable

Matrix row **Sandbox Access** ON.

## Verify (on)

- POC / sandbox admin surfaces reachable per current IA (e.g. System Admin → POC Sandbox, Configuration → Sandbox Access).

## Verify (off)

- Legacy `adminPoc` view and any chrome keyed to `adminPoc` hidden / blocked.

## Note

Much of POC data now lives under **Configuration → Sandbox Access**; ensure that section’s nav is consistent with this key if you want a single toggle.
