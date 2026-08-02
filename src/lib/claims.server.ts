import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Records a successful €1 payment and confirms the claim. Idempotent per claim. */
export async function markClaimPaid(input: {
  claimId: string;
  userId: string;
  amountCents: number;
  currency: string;
}) {
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("claim_id", input.claimId)
    .eq("status", "succeeded")
    .maybeSingle();

  if (!existing) {
    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: input.userId,
      claim_id: input.claimId,
      amount_cents: input.amountCents,
      currency: input.currency,
      status: "succeeded",
      provider: "stripe",
    });
    if (error) throw error;
  }

  const { error: claimError } = await supabaseAdmin
    .from("claims")
    .update({ status: "confirmed" })
    .eq("id", input.claimId);
  if (claimError) throw claimError;
}
