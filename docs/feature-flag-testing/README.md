# Feature flag & visibility — how to test

Configuration lives at **Configuration → Feature Flags** (admin users). Toggles apply to **all users, including admins**: disabled capabilities are **hidden** in the UI (not greyed out).

## Before you start

1. Sign in as an **admin**.
2. Open **Configuration** from the sidebar.
3. Use **Feature Flags** to load the control matrix; **Save** after changes (or use the per-row actions as implemented).

## One-pagers

### Feature flags (`featureFlags`)

| Doc | Flag key |
|-----|----------|
| [csv.md](./csv.md) | `csvImport` + `csvExport` + import visibility (one UI row) |
| [win-loss.md](./win-loss.md) | `winLoss` |
| [admin-csv-export.md](./admin-csv-export.md) | `adminCsvExport` |
| [pricing.md](./pricing.md) | `pricingCalculatorSync` + `pricingFullActivityForm` (one UI row) |

### Dashboard visibility (`dashboardVisibility`)

| Doc | Key |
|-----|-----|
| [visibility-dashboard.md](./visibility-dashboard.md) | `dashboard` |
| [visibility-reports.md](./visibility-reports.md) | `reports` |
| [visibility-admin.md](./visibility-admin.md) | `admin` |
| [visibility-activities.md](./visibility-activities.md) | `activities` |
| [visibility-accounts.md](./visibility-accounts.md) | `accounts` |
| [visibility-project-health.md](./visibility-project-health.md) | `projectHealth` |
| [visibility-sfdc-compliance.md](./visibility-sfdc-compliance.md) | `sfdcCompliance` |
| [visibility-log-activity.md](./visibility-log-activity.md) | `logActivity` |
| [visibility-admin-login.md](./visibility-admin-login.md) | `adminLogin` |
| [visibility-admin-poc.md](./visibility-admin-poc.md) | `adminPoc` |

**Note:** `csvImport` and `winLoss` each appear **once** in the matrix: that row updates both the feature flag and matching sidebar/dashboard visibility. Other keys (e.g. `reports`, `admin`) are visibility-only rows.

## If “Admin mode” is off and you are locked out

Sidebar entries **System Admin** and **Configuration** both respect the `admin` visibility key. If it is turned off for everyone, restore access via your deployment’s **admin config API** (e.g. `PUT` dashboard visibility / feature flags) or database config, then reload the app.
