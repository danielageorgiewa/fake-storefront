# Fake Storefront

A mini multi-country storefront — an onboarding exercise built to practice
terminal, Git, Claude Code, and Docker workflows.

## What it is

Two demo storefronts sharing one backend:

- **demo-fr** — French storefront
- **demo-es** — Spanish storefront

Around 20 sample products, no real payments. Runs entirely locally.

## Stack

- **Backend:** Medusa
- **Frontend:** Next.js
- **Packaging:** Docker

## VAT / tax design

Per-country VAT is handled entirely by **Medusa's Tax Module** — there is no tax
math in the storefront. Two complementary rules apply:

- **Destination-based settlement (authoritative).** The VAT actually charged is
  determined by the **shipping address** entered at checkout, not by which
  storefront (`/fr` vs `/es`) the order started in. Enter/change the address and
  Medusa recomputes the cart's tax lines: a Spanish delivery is taxed at 21%
  even if the order began on `/fr`. This follows the EU **destination principle**
  (One-Stop-Shop / OSS) and closes the "browse `/fr`, ship to ES, pay less VAT"
  loophole.
- **Context-based display (estimate).** Catalog and cart prices shown on `/fr`
  vs `/es` are **VAT-inclusive for that URL's country** (20% vs 21%), as required
  for EU B2C price display. Medusa computes these inclusive amounts when the
  product query carries the browsing `country_code` (`calculated_amount_with_tax`).
  Until a shipping address exists the cart's VAT line is labelled **"VAT (est.)"**;
  after address entry the checkout shows the authoritative figure.

Carts persist across `/es` ↔ `/fr` switches and simply re-price in the new
context.

**Provider seam.** VAT rates are currently seeded as static per-country values
(see `storefront/apps/backend/src/migration-scripts/initial-data-seed.ts` and
`.../src/scripts/setup-vat.ts`). In production these would be replaced by a tax
provider (Stripe Tax, Avalara, TaxJar) plugged into Medusa's Tax Module provider
interface, so rates and nexus resolve live at calculation time. No such
integration is scaffolded here.

## Status

🚧 Work in progress — scaffolding the project.