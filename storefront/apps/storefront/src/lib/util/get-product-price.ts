import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-percentage-diff"
import { convertToLocale } from "./money"

type VariantWithPrice = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
    original_amount: number
    // VAT-inclusive amounts, computed by Medusa's tax engine when the product
    // query carries a `country_code` tax context (see lib/data/products.ts).
    // Used for EU B2C display pricing so /fr shows the 20%-inclusive price and
    // /es the 21%-inclusive price for the same base amount. These are display
    // *estimates* keyed on the browsing country; the authoritative tax is
    // settled from the shipping address at checkout (destination principle).
    calculated_amount_with_tax?: number
    original_amount_with_tax?: number
    is_calculated_price_tax_inclusive?: boolean
    currency_code: string
    calculated_price: {
      price_list_type: string
    }
  }
}

export const getPricesForVariant = (variant: VariantWithPrice) => {
  if (!variant?.calculated_price?.calculated_amount) {
    return null
  }

  const price = variant.calculated_price

  // Prefer the tax-inclusive amount when the tax engine provided one; fall back
  // to the raw amount (e.g. when no country tax context was supplied). No tax
  // math happens here — the inclusive figure comes straight from Medusa.
  const calculatedDisplayAmount =
    price.calculated_amount_with_tax ?? price.calculated_amount
  const originalDisplayAmount =
    price.original_amount_with_tax ?? price.original_amount

  return {
    calculated_price_number: calculatedDisplayAmount,
    calculated_price: convertToLocale({
      amount: calculatedDisplayAmount,
      currency_code: price.currency_code,
    }),
    original_price_number: originalDisplayAmount,
    original_price: convertToLocale({
      amount: originalDisplayAmount,
      currency_code: price.currency_code,
    }),
    currency_code: price.currency_code,
    price_type: price.calculated_price.price_list_type,
    percentage_diff: getPercentageDiff(
      originalDisplayAmount,
      calculatedDisplayAmount
    ),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product: HttpTypes.StoreProduct
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const cheapestVariant = (product.variants as VariantWithPrice[])
      .filter((v) => !!v.calculated_price)
      .sort((a, b) => {
        return (
          (a.calculated_price?.calculated_amount ?? 0) -
          (b.calculated_price?.calculated_amount ?? 0)
        )
      })[0]

    return getPricesForVariant(cheapestVariant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant = product.variants?.find(
      (v) => v.id === variantId || v.sku === variantId
    ) as VariantWithPrice | undefined

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  }
}
