// @ts-check
/**
 * Volume discount
 * API: Product discount  (target: discounts.product.run)
 *
 * Applies a percentage off each cart line once that line crosses a quantity tier.
 * Tiers are read from a metafield on the discount node, so the merchant can change
 * them in the admin without a redeploy.
 *
 * Metafield: namespace \`$app:volume-discount\`, key \`tiers\`
 * Value (JSON): [{ "quantity": 3, "percentage": 5 }, { "quantity": 6, "percentage": 10 }]
 */

import { DiscountApplicationStrategy } from "../generated/api";

const DEFAULT_TIERS = [
  { quantity: 3, percentage: 5 },
  { quantity: 6, percentage: 10 },
  { quantity: 12, percentage: 15 },
];

const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {import("../generated/api").RunInput} input
 * @returns {import("../generated/api").FunctionRunResult}
 */
export function run(input) {
  const tiers = parseTiers(input?.discountNode?.metafield?.value);

  const discounts = input.cart.lines
    .map((line) => {
      const tier = bestTier(tiers, line.quantity);
      if (!tier) return null;

      return {
        targets: [{ cartLine: { id: line.id } }],
        value: { percentage: { value: tier.percentage } },
        message: "Buy " + tier.quantity + "+ and save " + tier.percentage + "%",
      };
    })
    .filter(Boolean);

  // Return an empty result rather than throwing. A thrown error makes the whole
  // discount fail and the merchant gets no feedback about why.
  if (discounts.length === 0) return EMPTY_DISCOUNT;

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.First,
    discounts,
  };
}

/** Merchant input is untrusted: validate it and always fall back to defaults. */
function parseTiers(raw) {
  if (!raw) return DEFAULT_TIERS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TIERS;

    const clean = parsed
      .filter((t) => Number(t.quantity) > 0 && Number(t.percentage) > 0)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity));

    return clean.length > 0 ? clean : DEFAULT_TIERS;
  } catch {
    return DEFAULT_TIERS;
  }
}

/** Highest tier the quantity qualifies for, or null. */
function bestTier(tiers, quantity) {
  let match = null;
  for (const tier of tiers) {
    if (quantity >= Number(tier.quantity)) match = tier;
  }
  return match;
}
