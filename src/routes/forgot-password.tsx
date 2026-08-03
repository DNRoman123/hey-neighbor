import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PhoneShell } from "@/components/PhoneShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset Password — Hey Neighbor" },
      {
        name: "description",
        content: "Request a secure password reset link for your Hey Neighbor account.",
      },
      { property: "og:title", content: "Reset Password — Hey Neighbor" },
      { property: "og:description", content: "Recover access to your Hey Neighbor account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordScreen,
});

function ForgotPasswordScreen() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) {
      toast.error(t("Enter a valid email"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Password reset email sent. Check your inbox."));
  }

  return (
    <PhoneShell>
      <div className="px-6 pt-2">
        <Link
          to="/"
          aria-label="Back to login"
          className="flex size-10 items-center justify-center -ml-2"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <div className="mx-auto mt-8 flex size-20 items-center justify-center rounded-full bg-primary-soft">
          <Mail className="size-9 text-primary" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-extrabold">{t("Reset your password")}</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          {t("Enter your email and we'll send you a secure reset link.")}
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 focus-within:border-primary">
            <Mail className="size-5 text-muted-foreground" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("Email")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Button
            type="submit"
            disabled={busy}
            className="h-13 w-full rounded-xl text-[15px] font-bold"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("Send reset link")}
          </Button>
        </form>
      </div>
    </PhoneShell>
  );
}
