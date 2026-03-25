# Testing: Dashboard visibility (`dashboard`)

## What it controls

Sidebar / chrome for the main **Dashboard** overview (`data-dashboard="dashboard"`).

## Enable

Configuration → Feature Flags → matrix row **Dashboard** → visible ON.

## Verify (on)

- **Dashboard** nav item visible; card dashboard loads stats and charts.

## Verify (off)

- **Dashboard** nav hidden; opening dashboard via code should be blocked like other views (toast + no switch).

**Warning:** If this is off, ensure users still have another accessible home view (`getAccessibleView` fallback).
