# Testing: Win / Loss (`winLoss`)

## What it controls

- **Feature flag:** `winLoss` — win/loss workflows, pickers, project closure fields.
- **Visibility:** **Win/Loss** — nav and dashboard cards tied to `winLoss`.

## How to enable

1. **Configuration → Feature Flags**
2. Enable **Win/Loss Tracking** and visibility **Win/Loss**.

## How to verify (enabled)

1. Sidebar: **Win/Loss** appears.
2. Dashboard (card UI): **Wins** / **Losses** stat cards for the selected month appear.
3. Activities or header: **Update Win/Loss** (or equivalent) visible where implemented.
4. Win/loss view loads projects and filters.

## How to verify (disabled)

1. **Win/Loss** sidebar entry **gone**.
2. Dashboard: **no** wins/losses stat cards for that month.
3. Win/loss-related buttons with `data-feature="winLoss"` hidden.
4. `#winlossView` has `data-feature="winLoss"` / `data-dashboard="winLoss"` — view stays hidden.

## Edge cases

- Disabling while on win/loss view: refresh config or reload; app should leave the view if access is lost.
