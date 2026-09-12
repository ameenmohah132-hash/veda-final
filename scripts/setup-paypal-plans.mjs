/**
 * scripts/setup-paypal-plans.mjs
 *
 * One-time helper that creates the Veda Premium PayPal Product and its
 * single Monthly Billing Plan ($4.17/month — there is no annual plan) via
 * the PayPal REST API, and prints the resulting plan ID so you can paste it
 * into your .env file as PAYPAL_PLAN_ID_MONTHLY.
 *
 * Usage:
 *   PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=... PAYPAL_MODE=sandbox \
 *     node scripts/setup-paypal-plans.mjs
 *
 * You can also just create this in the PayPal dashboard UI under
 * Apps & Credentials > (your app) > Products/Plans if you'd rather do it
 * by hand — this script is purely a convenience.
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
const BASE = PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error("Missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET environment variables.");
  process.exit(1);
}

async function getToken() {
  const basic = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const resp = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) throw new Error(`Token request failed: ${resp.status} ${await resp.text()}`);
  const json = await resp.json();
  return json.access_token;
}

async function createProduct(token) {
  const resp = await fetch(`${BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `veda-product-${Date.now()}`,
    },
    body: JSON.stringify({
      name: "Veda Premium",
      description: "Unlimited AI tutoring, weekly PDF reports, and advanced financial forecasts in Veda.",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });
  if (!resp.ok) throw new Error(`Product creation failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function createMonthlyPlan(token, productId) {
  const resp = await fetch(`${BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `veda-plan-monthly-${Date.now()}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name: "Veda Premium (Monthly)",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = infinite, auto-renews until cancelled
          pricing_scheme: { fixed_price: { value: "4.17", currency_code: "USD" } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
      },
    }),
  });
  if (!resp.ok) throw new Error(`Plan creation failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function main() {
  console.log(`Creating PayPal product & monthly plan in ${PAYPAL_MODE.toUpperCase()} mode...`);
  const token = await getToken();

  const product = await createProduct(token);
  console.log(`Product created: ${product.id}`);

  const monthly = await createMonthlyPlan(token, product.id);
  console.log(`Monthly plan created: ${monthly.id}`);

  console.log("\nAdd these to your .env file:\n");
  console.log(`PAYPAL_PLAN_ID_MONTHLY="${monthly.id}"`);
  console.log(`VITE_PAYPAL_PLAN_ID_MONTHLY="${monthly.id}"`);
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});

