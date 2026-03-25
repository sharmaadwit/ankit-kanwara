# Testing: Login activity (`adminLogin`)

## What it controls

Access to **Login Activity** detailed view (`adminLoginLogs`) — keyed in `getDashboardVisibilityKey` as `adminLogin`.

## Enable

Matrix row **Login Activity** ON.

## Verify (on)

- Admin can open login activity detail (from System Admin link or direct `switchView('adminLoginLogs')` if permitted).

## Verify (off)

- Navigation to login logs view blocked; related nav should be hidden if wired to this key.

## Note

Confirm System Admin sidebar link uses the same visibility key if you expect it to hide with the flag.
