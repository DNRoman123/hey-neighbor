import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose New Password — Hey Neighbor" },
      { name: "description", content: "Choose a new password for your Hey Neighbor account." },
      { property: "og:title", content: "Choose New Password — Hey Neighbor" },
      { property: "og:description", content: "Securely update your Hey Neighbor password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const t = useT();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [validRecovery, setValidRecovery] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) {
        setValidRecovery(true);
        setCheckingRecovery(false);
      }
    });

    void (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const legacyRecovery = hash.get("type") === "recovery" || query.get("type") === "recovery";
      const code = query.get("code");
      const { data: sessionData } = await supabase.auth.getSession();
      let valid = Boolean(sessionData.session) && legacyRecovery;

      if (code && !sessionData.session) {
        const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);
        valid = Boolean(exchangeData.session) && !error;
      } else if (code && sessionData.session) {
        valid = true;
      }

      if (active) {
        setValidRecovery(valid || legacyRecovery);
        setCheckingRecovery(false);
      }
    })();

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validRecovery) {
      toast.error(t("This reset link is invalid or has expired. Request a new one."));
      return;
    }
    if (password.length < 8) {
      toast.error(t("Use at least 8 characters"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("Passwords do not match"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Your password has been updated."));
    navigate({ to: "/home", replace: true });
  }

  return (
    <PhoneShell>
      <div className="px-6 pt-10">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary-soft">
          <KeyRound className="size-9 text-primary" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-extrabold">{t("Choose a new password")}</h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {t("Enter and confirm your new password.")}
        </p>
        <form onSubmit={submit} className="mt-7 space-y-3">
          {[
            { value: password, set: setPassword, label: "Password" },
            { value: confirm, set: setConfirm, label: "Confirm Password" },
          ].map((field) => (
            <label
              key={field.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 focus-within:border-primary"
            >
              <Lock className="size-5 text-muted-foreground" />
              <input
                type="password"
                autoComplete="new-password"
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                placeholder={t(field.label)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          ))}
          <Button
            type="submit"
            disabled={busy || checkingRecovery || !validRecovery}
            className="h-13 w-full rounded-xl text-[15px] font-bold"
          >
            {(busy || checkingRecovery) && <Loader2 className="size-4 animate-spin" />}
            {checkingRecovery ? t("Checking reset link") : t("Update password")}
          </Button>
        </form>
        {!checkingRecovery && !validRecovery && (
          <p className="mt-4 text-center text-[13px] text-destructive">
            {t("This reset link is invalid or has expired. Request a new one.")}
          </p>
        )}
      </div>
    </PhoneShell>
  );
}
