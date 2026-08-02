import { useI18n, type Lang } from "@/lib/i18n";

const options: { value: Lang; label: string; short: string }[] = [
  { value: "en", label: "English", short: "EN" },
  { value: "es", label: "Español", short: "ES" },
];

export function LanguageToggle({ tone = "default" }: { tone?: "default" | "light" }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-full border p-0.5 ${
        tone === "light" ? "border-primary-foreground/40" : "border-border bg-card"
      }`}
    >
      {options.map((o) => {
        const active = lang === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setLang(o.value)}
            aria-pressed={active}
            aria-label={o.label}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
              active
                ? tone === "light"
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary text-primary-foreground"
                : tone === "light"
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
            }`}
          >
            {o.short}
          </button>
        );
      })}
    </div>
  );
}
