// @ts-check
/**
 * Payment customization
 * API: Payment customization  (target: purchase.payment-customization.run)
 *
 * Hides cash on delivery above a spend limit, and moves the merchant's
 * preferred method to the top of the list.
 *
 * The spend limit is stored on the payment customization node as a metafield,
 * so support staff can raise or lower it without shipping code.
 */

const DEFAULT_COD_LIMIT = 20000; // in the shop currency, e.g. 200.00

/**
 * @param {import("../generated/api").RunInput} input
 * @returns {import("../generated/api").FunctionRunResult}
 */
export function run(input) {
  const operations = [];

  const limit = toNumber(input?.paymentCustomization?.metafield?.value, DEFAULT_COD_LIMIT);
  const total = toNumber(input?.cart?.cost?.totalAmount?.amount, 0);
  const methods = input?.paymentMethods ?? [];

  if (total > limit) {
    for (const method of methods) {
      if (isCashOnDelivery(method.name)) {
        operations.push({ hide: { paymentMethodId: method.id } });
      }
    }
  }

  // Ordering is expressed by moving one method to a new index.
  const preferred = methods.find((method) => isPreferred(method.name));
  if (preferred && methods.indexOf(preferred) !== 0) {
    operations.push({ move: { paymentMethodId: preferred.id, index: 0 } });
  }

  return { operations };
}

function isCashOnDelivery(name = "") {
  const lower = name.toLowerCase();
  return lower.includes("cash on delivery") || lower.includes("cod");
}

function isPreferred(name = "") {
  return name.toLowerCase().includes("shop pay");
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
