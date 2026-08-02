import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type ConfirmResult = { status: "paid" | "pending" } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string | undefined; userId?: string | undefined },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    const hit = found.data[0];
    if (hit) return hit.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (options.userId && customer.metadata?.['userId'] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

/** Creates an embedded checkout session for one extra €1 item claim. */
export const createClaimCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { claimId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9-]+$/.test(data.claimId)) throw new Error("Invalid claimId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    const { supabase, userId } = context;

    const { data: claim, error } = await supabase
      .from("claims")
      .select("id, receiver_id, status")
      .eq("id", data.claimId)
      .maybeSingle();
    if (error || !claim) return { error: "Claim not found" };
    if (claim.receiver_id !== userId) return { error: "Not your claim" };
    if (claim.status === "confirmed") return { error: "This claim is already confirmed" };

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: ["extra_claim_onetime"] });
      const stripePrice = prices.data[0];
      if (!stripePrice) return { error: "Price not found" };

      const { data: userData } = await supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: userData.user?.email ?? undefined,
        userId,
      });

      const productId = typeof stripePrice.product === "string"
        ? stripePrice.product
        : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: product.name },
        managed_payments: { enabled: true },
        metadata: { userId, claimId: data.claimId, managed_payments: "true" },
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Confirms a claim after the buyer returns from checkout (webhook is the primary path). */
export const confirmClaimPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.sessionId)) throw new Error("Invalid sessionId");
    return data;
  })
  .handler(async ({ data, context }): Promise<ConfirmResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const claimId = session.metadata?.['claimId'];
      if (!claimId) return { error: "Missing claim reference" };
      if (session.metadata?.['userId'] !== context.userId) return { error: "Not your payment" };
      if (session.payment_status === "unpaid") return { status: "pending" };

      const { markClaimPaid } = await import("@/lib/claims.server");
      await markClaimPaid({
        claimId,
        userId: context.userId,
        amountCents: session.amount_total ?? 100,
        currency: (session.currency ?? "eur").toUpperCase(),
      });
      return { status: "paid" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
