import { Heart, Leaf, Wallet, Users, Baby, HeartHandshake } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AppDescription({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const t = useT();
  const isLight = tone === "light";

  const points = [
    { icon: Leaf, label: "Reduce Waste" },
    { icon: Wallet, label: "Save Money" },
    { icon: Users, label: "Meet Neighbors" },
    { icon: Baby, label: "Help Families" },
    { icon: HeartHandshake, label: "Build Community" },
  ];

  return (
    <div className="mt-auto px-5 pt-6">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 ${
          isLight
            ? "bg-primary-foreground/10 border border-primary-foreground/20"
            : "bg-primary-soft border border-primary/20"
        }`}
      >
        {/* Decorative background shape */}
        <div
          className={`pointer-events-none absolute -right-6 -top-6 size-28 rounded-full opacity-30 ${
            isLight ? "bg-primary-foreground/20" : "bg-primary/20"
          }`}
        />

        <div className="relative flex items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
              isLight ? "bg-primary-foreground/20" : "bg-primary/15"
            }`}
          >
            <Heart
              className={`size-5 ${isLight ? "text-primary-foreground" : "text-primary"}`}
              strokeWidth={2.5}
            />
          </div>
          <div>
            <h3
              className={`text-[13px] font-bold leading-tight ${
                isLight ? "text-primary-foreground" : "text-primary-deep"
              }`}
            >
              {t("Sharing is always free.")}
            </h3>
            <p
              className={`mt-1.5 text-[11px] leading-relaxed ${
                isLight ? "text-primary-foreground/80" : "text-primary-deep/80"
              }`}
            >
              {t(
                "To keep Hey Neighbor safe, ad-free and encourage reducing waste, a 1 euro fee applies after your first 2 successful pickups.",
              )}
            </p>
            <p
              className={`mt-1.5 text-[11px] font-bold leading-relaxed ${
                isLight ? "text-primary-foreground/90" : "text-primary-deep/90"
              }`}
            >
              {t("We are helping people:")}
            </p>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-2">
          {points.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className={`rounded-xl px-2 py-2.5 text-center ${
                isLight ? "bg-primary-foreground/10" : "bg-background/60"
              }`}
            >
              <Icon
                className={`mx-auto size-4 ${isLight ? "text-primary-foreground" : "text-primary"}`}
                strokeWidth={2.5}
              />
              <p
                className={`mt-1 text-[9px] leading-tight font-bold ${
                  isLight ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {t(label)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
