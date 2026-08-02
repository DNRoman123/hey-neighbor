import { MapPin, Gift, Heart, MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

export function AppDescription({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const t = useT();
  const isLight = tone === "light";

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
                "Hey Neighbor is a community sharing app that connects you with neighbors within a 1 km radius. Give away items you no longer need or discover free items from people nearby, including unopened packaged food and household essentials. Chat securely to arrange convenient pickups, reduce waste, and strengthen your local community. Receiving items is free for your first 2 transactions each month. After that, each additional transaction is just €1. Share more, waste less, and make a positive impact—right in your own neighborhood.",
              )}
            </p>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <div
            className={`rounded-xl px-2 py-2.5 text-center ${
              isLight ? "bg-primary-foreground/10" : "bg-background/60"
            }`}
          >
            <MapPin
              className={`mx-auto size-4 ${isLight ? "text-primary-foreground" : "text-primary"}`}
              strokeWidth={2.5}
            />
            <p
              className={`mt-1 text-[10px] font-bold ${
                isLight ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {t("1 km")}
            </p>
            <p
              className={`text-[9px] leading-tight ${
                isLight ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {t("radius")}
            </p>
          </div>
          <div
            className={`rounded-xl px-2 py-2.5 text-center ${
              isLight ? "bg-primary-foreground/10" : "bg-background/60"
            }`}
          >
            <Gift
              className={`mx-auto size-4 ${isLight ? "text-primary-foreground" : "text-primary"}`}
              strokeWidth={2.5}
            />
            <p
              className={`mt-1 text-[10px] font-bold ${
                isLight ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {t("2 free")}
            </p>
            <p
              className={`text-[9px] leading-tight ${
                isLight ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {t("per month")}
            </p>
          </div>
          <div
            className={`rounded-xl px-2 py-2.5 text-center ${
              isLight ? "bg-primary-foreground/10" : "bg-background/60"
            }`}
          >
            <MessageCircle
              className={`mx-auto size-4 ${isLight ? "text-primary-foreground" : "text-primary"}`}
              strokeWidth={2.5}
            />
            <p
              className={`mt-1 text-[10px] font-bold ${
                isLight ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {t("Chat")}
            </p>
            <p
              className={`text-[9px] leading-tight ${
                isLight ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}
            >
              {t("& pickup")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
