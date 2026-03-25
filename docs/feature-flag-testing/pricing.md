# Testing: Pricing calculator (single admin toggle)

## What it controls

In **Configuration → Feature Flags** there is **one row**: **Pricing calculator**. Saving it updates **both** server flags:

| Key | Role |
|-----|------|
| `pricingCalculatorSync` | API integration, dashboard **Pricing** block, sync / link / delete |
| `pricingFullActivityForm` | When logging from pricing, use the **full** Log Activity form vs minimal (account + project only) |

**Display state** follows `pricingCalculatorSync` (master). **Enable** sets both to `true`; **Disable** sets both to `false`.

## How to enable

1. **Configuration → Feature Flags** → **Pricing calculator** → Enable → **Save changes**.
2. Deploy backend `/api/pricing-calculations/...` and env as needed (`docs/PRICING_CALC_INTEGRATION.md`).

## How to verify (enabled)

1. Dashboard shows the **Pricing** section; **Sync** works.
2. From a pricing row, **Log activity** opens the full form (industry, use cases, products, etc., not only account/project).

## How to verify (disabled)

1. No **Pricing** block on the dashboard.
2. Pricing-related CTAs from sync are off.

## Note

If the database ever has `pricingCalculatorSync: true` and `pricingFullActivityForm: false`, the UI still shows **Enabled** (master on). Saving without changes leaves that split; toggling **off** then **on** normalizes both to `true`.
