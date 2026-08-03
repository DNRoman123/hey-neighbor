import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail, Phone, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { StatusBar } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useUserId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/db";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hey Neighbor" },
      {
        name: "description",
        content:
          "Update your phone number and choose how you recover your Hey Neighbor account if you lose access.",
      },
      { property: "og:title", content: "Settings — Hey Neighbor" },
      {
        property: "og:description",
        content: "Manage your phone number and account recovery methods.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: SettingsScreen,
});

const boxClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-primary";

const phoneSchema = z
  .string()
  .trim()
  .max(30, { message: "Phone number is too long" })
  .refine((v) => v === "" || /^[+0-9()\-\s]{6,30}$/.test(v), {
    message: "Enter a valid phone number",
  });

const schema = z.object({
  phone: phoneSchema,
  recovery_phone: phoneSchema,
  recovery_email: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid recovery email",
    }),
  recovery_method: z.enum(["email", "phone", "both"]),
});

type Method = "email" | "phone" | "both";

function SettingsScreen() {
  const t = useT();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    recovery_phone: "",
    recovery_email: "",
    recovery_method: "email" as Method,
  });

  const data = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: () => fetchMyProfile(userId!),
    enabled: Boolean(userId),
  });

  const accountEmail = data.data?.priv?.email ?? "";

  useEffect(() => {
    const pv = data.data?.priv;
    if (!pv) return;
    setForm({
      phone: pv.phone ?? "",
      recovery_phone: pv.recovery_phone ?? pv.phone ?? "",
      recovery_email: pv.recovery_email ?? "",
      recovery_method: (pv.recovery_method as Method) ?? "email",
    });
  }, [data.data]);

  async function save() {
    if (!userId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(t(parsed.error.issues[0]?.message ?? "Check your details"));
      return;
    }
    const v = parsed.data;
    if ((v.recovery_method === "phone" || v.recovery_method === "both") && !v.recovery_phone) {
      toast.error(t("Add a recovery phone number first."));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("profile_private").upsert({
        id: userId,
        phone: v.phone,
        recovery_phone: v.recovery_phone,
        recovery_email: v.recovery_email,
        recovery_method: v.recovery_method,
      });
      if (error) throw error;
      toast.success(t("Settings saved."));
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
    } catch (error) {
      console.error(error);
      toast.error(t("Could not save your settings."));
    } finally {
      setBusy(false);
    }
  }

  async function sendResetLink() {
    const target = form.recovery_email || accountEmail;
    if (!target) {
      toast.error(t("Add a recovery email first."));
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(t("Password reset link sent."));
    } catch {
      toast.error(t("Could not send the reset link."));
    } finally {
      setSending(false);
    }
  }

  const methods: { value: Method; label: string; hint: string }[] = [
    {
      value: "email",
      label: "Email",
      hint: "We send a reset link to your recovery email.",
    },
    {
      value: "phone",
      label: "Phone",
      hint: "We contact you on your recovery phone number.",
    },
    {
      value: "both",
      label: "Email and phone",
      hint: "Use whichever is available when you need to get back in.",
    },
  ];

  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-primary">
        <StatusBar tone="light" />
        <div className="flex justify-center pt-2 pb-1">
          <Logo size="sm" tone="light" />
        </div>
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-3 pt-1">
          <Link to="/profile" aria-label={t("Back")} className="text-primary-foreground">
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-center text-lg font-bold text-primary-foreground">{t("Settings")}</h1>
          <span />
        </div>

        <div className="flex-1 rounded-t-[2rem] bg-card px-6 pb-28 pt-5">
          {data.isPending ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("Loading…")}
            </p>
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="flex items-center gap-2 text-[14px] font-bold">
                  <Phone className="size-4 text-primary" strokeWidth={2.4} />
                  {t("Phone number")}
                </h2>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("Only shared with neighbors you agree to meet.")}
                </p>
                <input
                  className={`${boxClass} mt-3`}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+34 600 000 000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </section>

              <section>
                <h2 className="flex items-center gap-2 text-[14px] font-bold">
                  <ShieldCheck className="size-4 text-primary" strokeWidth={2.4} />
                  {t("Account recovery")}
                </h2>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {t("Choose how we help you back in if you forget your password.")}
                </p>

                <div className="mt-3 space-y-2">
                  {methods.map((m) => (
                    <label
                      key={m.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                        form.recovery_method === m.value
                          ? "border-primary bg-primary-soft"
                          : "border-border bg-background"
                      }`}
                    >
                      <input
                        type="radio"
                        name="recovery_method"
                        className="mt-1 accent-[hsl(var(--primary))]"
                        checked={form.recovery_method === m.value}
                        onChange={() => setForm((f) => ({ ...f, recovery_method: m.value }))}
                      />
                      <span>
                        <span className="block text-[13px] font-bold">{t(m.label)}</span>
                        <span className="block text-[12px] text-muted-foreground">{t(m.hint)}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <label className="mt-4 block">
                  <span className="mb-1 block text-[12px] font-bold">{t("Recovery email")}</span>
                  <input
                    className={boxClass}
                    inputMode="email"
                    autoComplete="email"
                    placeholder={accountEmail || "you@example.com"}
                    value={form.recovery_email}
                    onChange={(e) => setForm((f) => ({ ...f, recovery_email: e.target.value }))}
                  />
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-[12px] font-bold">{t("Recovery phone")}</span>
                  <input
                    className={boxClass}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+34 600 000 000"
                    value={form.recovery_phone}
                    onChange={(e) => setForm((f) => ({ ...f, recovery_phone: e.target.value }))}
                  />
                </label>
              </section>

              <Button
                onClick={save}
                disabled={busy}
                size="lg"
                className="h-12 w-full rounded-xl text-[14px] font-bold"
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Save changes")}
              </Button>

              <div className="rounded-2xl bg-primary-soft p-4">
                <p className="flex items-center gap-2 text-[13px] font-bold text-primary-deep">
                  <KeyRound className="size-4" strokeWidth={2.4} /> {t("Test your recovery")}
                </p>
                <p className="mt-1 text-[12px] text-primary-deep/80">
                  {t("Send a password reset link to")} {form.recovery_email || accountEmail || "—"}
                </p>
                <Button
                  variant="outline"
                  onClick={sendResetLink}
                  disabled={sending}
                  className="mt-3 h-11 w-full rounded-xl border-primary/40 bg-card text-[13px] font-bold"
                >
                  {sending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 size-4" />
                  )}
                  {t("Send reset link")}
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-auto px-4 py-3 text-center text-[11px] text-primary-foreground/70">
          © 2026 Hey Neighbor
        </div>
      </div>
      <BottomNav />
    </>
  );
}
