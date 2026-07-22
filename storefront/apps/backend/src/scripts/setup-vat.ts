import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createTaxRatesWorkflow } from "@medusajs/medusa/core-flows";

// Standard VAT rate per country (percentage). Medusa's tax engine picks the tax
// region from the cart's shipping-address country_code, so these per-country rates
// are what make /fr charge 20% and /es charge 21% for the same product.
//
// PROVIDER SEAM: these manually-managed rates are an MVP stand-in. Production
// would register a tax provider (Stripe Tax, Avalara, TaxJar) via Medusa's Tax
// Module provider interface (`provider_id` on the tax region) so rates and nexus
// are resolved live at calculation time. Comment only — no integration here.
const VAT_RATES: Record<string, number> = {
  fr: 20,
  es: 21,
  gb: 20,
  de: 19,
  dk: 25,
  se: 25,
  it: 22,
};

// Idempotent: ensures each seeded tax region has a default VAT rate. Safe to
// re-run — regions that already have a default rate are skipped. The seed
// (initial-data-seed.ts) sets these on fresh installs; this script backfills a
// database that was seeded before rates were added.
//
//   npx medusa exec ./src/scripts/setup-vat.ts
export default async function setupVat({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: [
      "id",
      "country_code",
      "tax_rates.id",
      "tax_rates.is_default",
      "tax_rates.rate",
    ],
  });

  const ratesToCreate: {
    tax_region_id: string;
    name: string;
    rate: number;
    code: string;
    is_default: boolean;
  }[] = [];

  for (const region of taxRegions) {
    const countryCode = region.country_code?.toLowerCase();
    const targetRate = countryCode ? VAT_RATES[countryCode] : undefined;

    if (targetRate === undefined) {
      logger.info(
        `No VAT rate configured for country "${region.country_code}" — skipping.`
      );
      continue;
    }

    const existingDefault = (region.tax_rates ?? []).find(
      (r) => r?.is_default
    );

    if (existingDefault) {
      logger.info(
        `${region.country_code}: default tax rate already set (${existingDefault.rate}%) — skipping.`
      );
      continue;
    }

    ratesToCreate.push({
      tax_region_id: region.id,
      name: `${region.country_code?.toUpperCase()} VAT`,
      rate: targetRate,
      code: "VAT",
      is_default: true,
    });
  }

  if (ratesToCreate.length === 0) {
    logger.info("All tax regions already have a default VAT rate. Nothing to do.");
    return;
  }

  await createTaxRatesWorkflow(container).run({
    input: ratesToCreate,
  });

  logger.info(
    `Created default VAT rates for: ${ratesToCreate
      .map((r) => `${r.name} (${r.rate}%)`)
      .join(", ")}.`
  );
}
