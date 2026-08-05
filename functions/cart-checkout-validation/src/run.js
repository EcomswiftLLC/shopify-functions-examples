// @ts-check
/**
 * Cart and checkout validation
 * API: Cart and checkout validation  (target: purchase.validation.run)
 *
 * Blocks checkout with a human readable reason when:
 *   - a line exceeds the per-customer purchase limit set on the product
 *   - the order is below the store minimum
 *   - a wholesale-only product is in a retail cart
 *
 * Errors returned here appear on the cart and checkout. Keep the copy short and
 * actionable, and always point at the field or line the shopper can fix.
 */

const MINIMUM_ORDER_AMOUNT = 2500; // 25.00 in the shop currency

/**
 * @param {import("../generated/api").RunInput} input
 * @returns {import("../generated/api").FunctionRunResult}
 */
export function run(input) {
  const errors = [];

  const total = Number(input?.cart?.cost?.subtotalAmount?.amount ?? 0);
  if (total > 0 && total < MINIMUM_ORDER_AMOUNT / 100) {
    errors.push({
      localizedMessage: "Orders start at 25.00. Add a little more to check out.",
      target: "$.cart",
    });
  }

  const isWholesale = (input?.cart?.buyerIdentity?.customer?.wholesale?.value ?? "") === "true";

  input.cart.lines.forEach((line, index) => {
    const variant = line.merchandise;
    if (variant?.__typename !== "ProductVariant") return;

    const limit = Number(variant.product?.purchaseLimit?.value ?? 0);
    if (limit > 0 && line.quantity > limit) {
      errors.push({
        localizedMessage:
          "You can order up to " + limit + " of " + variant.product.title + " per order.",
        // Targeting the specific line makes the error render next to it.
        target: "$.cart.lines[" + index + "].quantity",
      });
    }

    const wholesaleOnly = (variant.product?.wholesaleOnly?.value ?? "") === "true";
    if (wholesaleOnly && !isWholesale) {
      errors.push({
        localizedMessage: variant.product.title + " is available to trade accounts only.",
        target: "$.cart.lines[" + index + "]",
      });
    }
  });

  return { errors };
}
