import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { TopBar } from "@/components/TopBar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { useUserId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EXTRA_CLAIM_FEE_CENTS, FREE_CLAIM_LIMIT, openConversation } from "@/lib/db";
import { useT } from "@/lib/i18n";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { confirmClaimPayment, createClaimCheckoutSession } from "@/utils/payments.functions";

export const Route = createFileRoute("/_authenticated/pay/$claimId")({
  head: () => ({
    meta: [
      { title: "Extra claim — €1 — Hey Neighbor" },
      {
        name: "description",
        content: "Your 2 free claims this month are used. Pay €1 to claim this extra item from a neighbor.",
      },
      { property: "og:title", content: "Extra claim — €1 — Hey Neighbor" },
      { property: "og:description", content: "€1 per extra claim after your 2 free ones each month." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof search['session_id'] === "string" ? search['session_id'] : undefined,
  }),

  component: PayScreen,
});

function PayScreen() {
  const t = useT();
  const { claimId } = Route.useParams();
  const { session_id: sessionId } = Route.useSearch();
  const userId = useUserId();
  const navigate = useNavigate();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [finalising, setFinalising] = useState(Boolean(sessionId));

  const claim = useQuery({
    queryKey: ["claim", claimId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("id, listing_id, owner_id, receiver_id, status, fee_cents")
        .eq("id", claimId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // After returning from checkout, confirm the payment then open the chat.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await confirmClaimPayment({
          data: { sessionId, environment: getStripeEnvironment() },
        });
        if (cancelled) return;
        if ("error" in result) throw new Error(result.error);
        if (result.status === "pending") {
          toast.info(t("Payment is processing — we'll confirm your claim as soon as it settles."));
          setFinalising(false);
          return;
        }
        toast.success(t("Payment complete — your claim is confirmed."));
        const fresh = await supabase
          .from("claims")
          .select("listing_id, owner_id, receiver_id")
          .eq("id", claimId)
          .maybeSingle();
        if (cancelled || !fresh.data) return;
        const conversationId = await openConversation(
          fresh.data.listing_id,
          fresh.data.owner_id,
          fresh.data.receiver_id,
        );
        navigate({ to: "/chat/$id", params: { id: conversationId } });
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : t("Payment could not be confirmed."));
          setFinalising(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, claimId, navigate]);

  const fetchClientSecret = async (): Promise<string> => {
    const result = await createClaimCheckoutSession({
      data: {
        claimId,
        returnUrl: `${window.location.origin}/pay/${claimId}?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error(t("Checkout could not be started."));
    return result.clientSecret;
  };

  const fee = ((claim.data?.fee_cents ?? EXTRA_CLAIM_FEE_CENTS) / 100).toFixed(2);

  return (
    <PhoneShell>
      <PaymentTestModeBanner />
      <TopBar title={t("Extra claim")} subtitle={t("One-off €1.00 fee")} backTo="/home" />

      <div className="px-6">
        {checkoutOpen ? (
          <div className="mt-4">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <Button
              variant="ghost"
              onClick={() => setCheckoutOpen(false)}
              className="mt-3 w-full rounded-xl text-sm font-bold"
            >
              {t("Cancel")}
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex justify-center">
              <div className="flex size-32 items-center justify-center rounded-full bg-primary-soft">
                <CreditCard className="size-14 text-primary" strokeWidth={1.6} />
              </div>
            </div>

            <h1 className="mt-6 text-center text-xl font-extrabold">
              {t("You've used your")} {FREE_CLAIM_LIMIT} {t("free claims this month")}
            </h1>
            <p className="mt-3 text-center text-[15px] leading-relaxed text-muted-foreground">
              {t("Receiving is free for")} {FREE_CLAIM_LIMIT} {t("items every month. Each extra item you claim costs €")}
              {(EXTRA_CLAIM_FEE_CENTS / 100).toFixed(2)} {t("— sharing your own items is always free.")}
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{t("Extra claim")}</span>
                <span>€{fee}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">{t("Total due")}</span>
                <span className="font-extrabold text-primary">€{fee}</span>
              </div>
            </div>

            {claim.data?.status === "confirmed" ? (
              <p className="mt-6 text-center text-sm font-bold text-primary">{t("This claim is already confirmed.")}</p>
            ) : (
              <Button
                size="lg"
                disabled={claim.isPending || finalising}
                onClick={() => setCheckoutOpen(true)}
                className="mt-6 h-13 w-full rounded-xl text-[15px] font-bold"
              >
                {finalising && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Pay")} €{fee}
              </Button>
            )}

            <p className="mt-4 flex items-start gap-2 text-[12px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              {t("Payment is handled securely by our payment provider. Your card details never touch Hey Neighbor.")}
            </p>
          </>
        )}
      </div>
    </PhoneShell>
  );
}
