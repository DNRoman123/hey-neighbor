import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PhoneShell } from "@/components/PhoneShell";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import itemMix from "@/assets/item-mix.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hey Neighbor — Share Food, Clothes & More Nearby" },
      {
        name: "description",
        content:
          "Sign up for Hey Neighbor and start sharing food, clothes, furniture, and everyday items with neighbors within 1 km of you.",
      },
      { property: "og:title", content: "Hey Neighbor — Share Food, Clothes & More Nearby" },
      {
        property: "og:description",
        content: "Give unused items a second home — close to you.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: AuthScreen,
});

const signupSchema = z.object({
  username: z.string().trim().min(2, "Username is too short").max(40),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
  confirm: z.string(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password"),
});

function Field({
  icon: Icon,
  placeholder,
  secret = false,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  icon: typeof User;
  placeholder: string;
  secret?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [shown, setShown] = useState(false);
  const t = useT();
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 focus-within:border-primary">
      <Icon className="size-5 shrink-0 text-muted-foreground" strokeWidth={2} />
      <input
        type={secret && !shown ? "password" : type}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {secret && (
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t("Hide password") : t("Show password")}
          className="text-muted-foreground"
        >
          {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      )}
    </label>
  );
}

function AuthScreen() {
  const navigate = useNavigate();
  const t = useT();
  const [tab, setTab] = useState<"login" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const parsed = signupSchema.safeParse({ username, email, password, confirm });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? t("Check your details"));
          return;
        }
        if (password !== confirm) {
          toast.error(t("Passwords do not match"));
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: parsed.data.username, first_name: parsed.data.username },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        // A session is present only for an already confirmed identity. New
        // email/password accounts must confirm through the branded email first.
        if (data.session) {
          navigate({ to: "/home", replace: true });
          return;
        }
        navigate({ to: "/verify", search: { email: parsed.data.email } });
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? t("Check your details"));
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        navigate({ to: "/home", replace: true });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneShell>
      <div className="px-6 pt-3">
        <h1 className="mt-4 text-center text-[15px] font-bold leading-snug">
          {t("Share and find anything in your neighborhood")}
        </h1>
        <p className="mt-2 text-center text-[13px] font-semibold leading-snug text-muted-foreground">
          {t("Share food, clothing, furniture and more...")}
        </p>

        <div className="mt-5 flex items-stretch gap-3 overflow-hidden rounded-2xl bg-primary-soft p-4">
          <p className="flex-1 self-center text-[13px] font-semibold leading-snug text-primary-deep">
            {t("All items deserve a second home.")}
            <Heart
              className="ml-1 inline size-3.5 -translate-y-px fill-primary text-primary"
              strokeWidth={0}
            />
          </p>
          <img
            src={itemMix}
            alt="Unopened food, clothing, furniture, and everyday items ready to share"
            width={1024}
            height={1024}
            className="size-24 shrink-0 rounded-xl object-cover"
          />
        </div>

        <div className="mt-6 grid grid-cols-2">
          {(["login", "signup"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`border-b-2 pb-2.5 text-sm font-bold transition-colors ${
                tab === tabKey
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {tabKey === "login" ? t("Log In") : t("Sign Up")}
            </button>
          ))}
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          {tab === "signup" && (
            <Field
              icon={User}
              placeholder={t("Username")}
              value={username}
              onChange={setUsername}
            />
          )}
          <Field
            icon={Mail}
            placeholder={t("Email")}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            icon={Lock}
            placeholder={t("Password")}
            secret
            value={password}
            onChange={setPassword}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
          />
          {tab === "signup" && (
            <Field
              icon={Lock}
              placeholder={t("Confirm Password")}
              secret
              value={confirm}
              onChange={setConfirm}
            />
          )}

          <Button
            type="submit"
            size="lg"
            disabled={busy}
            className="mt-2 h-13 w-full rounded-xl text-[15px] font-bold"
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            {tab === "signup" ? t("Create Account") : t("Log In")}
          </Button>
          {tab === "login" && (
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-[13px] font-bold text-primary hover:underline"
              >
                {t("Forgot your password?")}
              </Link>
            </div>
          )}
        </form>

        <p className="mt-5 px-2 text-center text-[13px] leading-relaxed text-muted-foreground">
          {t("By creating an account, you agree to our")}{" "}
          <Link to="/terms" className="font-semibold text-foreground underline">
            {t("Terms of Service")}
          </Link>{" "}
          {t("and")}{" "}
          <Link to="/privacy" className="font-semibold text-foreground underline">
            {t("Privacy Policy")}
          </Link>
          .
        </p>
      </div>
    </PhoneShell>
  );
}
