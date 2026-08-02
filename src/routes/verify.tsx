import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PhoneShell } from "@/components/PhoneShell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ email: z.string().email().optional() });

export const Route = createFileRoute("/verify")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Verify your email — Hey Neighbor" },
      {
        name: "description",
        content: "Confirm your email address to activate your Hey Neighbor account and start sharing.",
      },
      { property: "og:title", content: "Verify your email — Hey Neighbor" },
      { property: "og:description", content: "One quick step before you start sharing with neighbors." },
      { property: "og:url", content: "/verify" },
    ],
    links: [{ rel: "canonical", href: "/verify" }],
  }),
  component: VerifyScreen,
});

function VerifyScreen() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function resend() {
    if (!email) {
      toast.error(t("Go back and enter your email again."));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success(t("Verification email sent again."));
  }

  return (
    <PhoneShell>
      <div className="px-6">
        <Link to="/" aria-label={t("Go back")} className="flex size-10 items-center justify-center -ml-2">
          <ChevronLeft className="size-6" strokeWidth={2.4} />
        </Link>

        <div className="mt-6 flex justify-center">
          <div className="relative flex size-44 items-center justify-center rounded-full bg-primary-soft">
            <Mail className="size-24 text-primary" strokeWidth={1.4} />
            <span className="absolute bottom-3 right-3 flex size-12 items-center justify-center rounded-full border-4 border-background bg-primary">
              <Check className="size-6 text-primary-foreground" strokeWidth={3} />
            </span>
          </div>
        </div>

        <h1 className="mt-8 text-center text-2xl font-extrabold">{t("Verify Your Email")}</h1>
        <p className="mt-4 text-center text-[15px] leading-relaxed text-muted-foreground">
          {t("We've sent a verification link to")}{" "}
          <span className="font-bold text-primary">{email ?? t("your inbox")}</span>
        </p>
        <p className="mt-4 text-center text-[15px] leading-relaxed text-muted-foreground">
          {t("Please check your inbox and click the link to verify your email address. You can log in as soon as it's confirmed.")}
        </p>

        <Button
          size="lg"
          className="mt-9 h-13 w-full rounded-xl text-[15px] font-bold"
          onClick={() => navigate({ to: "/" })}
        >
          {t("Back to Log In")}
        </Button>

        <div className="mt-6 space-y-5 text-center text-[15px] font-bold text-primary">
          <button type="button" disabled={busy} onClick={resend} className="block w-full">
            {t("Resend Email")}
          </button>
          <Link to="/" className="block">
            {t("Change Email Address")}
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
