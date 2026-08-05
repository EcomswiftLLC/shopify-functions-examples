// @ts-check
/**
 * Delivery customization
 * API: Delivery customization  (target: purchase.delivery-customization.run)
 *
 * Two of the most requested behaviours in one function:
 *   1. Hide express delivery when the cart contains a made-to-order item.
 *   2. Rename the remaining options so the shipping step explains itself.
 *
 * Made-to-order items are identified by a product metafield, which means the
 * merchandising team controls the rule, not the developer.
 */

/**
 * @param {import("../generated/api").RunInput} input
 * @returns {import("../generated/api").FunctionRunResult}
 */
export function run(input) {
  const operations = [];

  const hasMadeToOrder = input.cart.lines.some((line) => {
    const variant = line.merchandise;
    return variant?.__typename === "ProductVariant" && variant.product?.madeToOrder?.value === "true";
  });

  for (const group of input.cart.deliveryGroups) {
    for (const option of group.deliveryOptions) {
      const handle = (option.handle || "").toLowerCase();
      const title = option.title || "";

      if (hasMadeToOrder && isExpress(handle, title)) {
        // Hiding is the documented way to remove an option. There is no delete.
        operations.push({ hide: { deliveryOptionHandle: option.handle } });
        continue;
      }

      const renamed = describe(title, hasMadeToOrder);
      if (renamed && renamed !== title) {
        operations.push({
          rename: { deliveryOptionHandle: option.handle, title: renamed },
        });
      }
    }
  }

  // An empty operations array is valid and means leave everything as it is.
  return { operations };
}

function isExpress(handle, title) {
  const haystack = handle + " " + title.toLowerCase();
  return ["express", "overnight", "next-day", "next day", "priority"].some((term) =>
    haystack.includes(term)
  );
}

function describe(title, hasMadeToOrder) {
  const lower = title.toLowerCase();

  if (lower.includes("standard")) {
    return hasMadeToOrder ? "Standard (made to order, ships in 2-3 weeks)" : "Standard (3-5 business days)";
  }
  if (lower.includes("pickup") || lower.includes("collect")) {
    return "Collect in store (ready in 2 hours)";
  }
  return null;
}
