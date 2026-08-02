import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "unpaid") break;
      const claimId = session.metadata?.claimId;
      const userId = session.metadata?.userId;
      if (!claimId || !userId) break;
      const { markClaimPaid } = await import("@/lib/claims.server");
      await markClaimPaid({
        claimId,
        userId,
        amountCents: session.amount_total ?? 100,
        currency: (session.currency ?? "eur").toUpperCase(),
      });
      break;
    }
    case "checkout.session.async_payment_failed":
      console.log("Async payment failed for claim:", event.data.object?.metadata?.claimId);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid or missing env query parameter:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
