import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

const STOCKED_QUANTITY = 1_000_000;

// Idempotent repair for the "products show out of stock" symptom, keeping
// manage_inventory: true. It re-asserts the two pieces of plumbing the storefront
// needs to report inventory_quantity > 0:
//   1. the stock location is linked to the (default) sales channel, and
//   2. every inventory item has a stock level at that location.
// Safe to re-run — existing links/levels are left untouched.
//
//   npx medusa exec ./src/scripts/repair-inventory.ts
export default async function repairInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // --- Resolve the stock location and its currently linked sales channels ---
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "sales_channels.id"],
  });

  if (stockLocations.length === 0) {
    logger.error(
      "No stock location found. Run the initial data seed (medusa db:migrate) first."
    );
    return;
  }

  const stockLocation = stockLocations[0];
  const linkedSalesChannelIds = new Set(
    (stockLocation.sales_channels ?? []).map((sc: { id: string }) => sc.id)
  );

  // --- Ensure the stock location is linked to the sales channel(s) ---
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default"],
  });

  const targetSalesChannels = salesChannels.filter(
    (sc: { is_default?: boolean; name?: string }) =>
      sc.is_default || sc.name === "Default Sales Channel"
  );
  const channelsToLink = (
    targetSalesChannels.length > 0 ? targetSalesChannels : salesChannels
  ).filter((sc: { id: string }) => !linkedSalesChannelIds.has(sc.id));

  if (channelsToLink.length > 0) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: channelsToLink.map((sc: { id: string }) => sc.id),
      },
    });
    logger.info(
      `Linked stock location "${stockLocation.name}" to sales channel(s): ${channelsToLink
        .map((sc: { name?: string }) => sc.name)
        .join(", ")}.`
    );
  } else {
    logger.info(
      `Stock location "${stockLocation.name}" already linked to its sales channel(s).`
    );
  }

  // --- Ensure every inventory item has a level at this location ---
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.location_id"],
  });

  const itemsMissingLevel = inventoryItems.filter(
    (item: { location_levels?: { location_id: string }[] }) =>
      !(item.location_levels ?? []).some(
        (lvl) => lvl.location_id === stockLocation.id
      )
  );

  if (itemsMissingLevel.length === 0) {
    logger.info(
      `All ${inventoryItems.length} inventory items already have a level at "${stockLocation.name}".`
    );
    return;
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: itemsMissingLevel.map((item: { id: string }) => ({
        location_id: stockLocation.id,
        stocked_quantity: STOCKED_QUANTITY,
        inventory_item_id: item.id,
      })),
    },
  });

  logger.info(
    `Created stock levels (${STOCKED_QUANTITY}) for ${itemsMissingLevel.length} inventory item(s) at "${stockLocation.name}".`
  );
}
