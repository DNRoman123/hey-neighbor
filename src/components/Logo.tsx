import { House, Heart } from "lucide-react";
import { useT } from "@/lib/i18n";

export function Logo({
  size = "lg",
  tone = "default",
  showTagline = true,
}: {
  size?: "sm" | "lg";
  tone?: "default" | "light";
  showTagline?: boolean;
}) {
  const t = useT();
  const big = size === "lg";
  const color = tone === "light" ? "text-primary-foreground" : "text-primary";
  const fill = tone === "light" ? "fill-primary-foreground" : "fill-primary";
  const taglineColor = tone === "light" ? "text-primary-foreground/80" : "text-muted-foreground";
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="flex items-center justify-center gap-3">
        <span className={`relative flex items-center justify-center ${color} ${big ? "size-16" : "size-10"}`}>
          <House className="size-full" strokeWidth={1.8} aria-hidden />
          <Heart
            className={`absolute translate-y-1 ${fill} ${big ? "size-5" : "size-3"}`}
            strokeWidth={0}
            aria-hidden
          />
        </span>
        <span
          className={`font-extrabold leading-[0.95] tracking-tight ${color} ${big ? "text-4xl" : "text-xl"}`}
        >
          Hey
          <br />
          Neighbor
        </span>
      </div>
      {showTagline && (
        <p className={`text-[11px] font-semibold tracking-tight ${taglineColor}`}>
          {t("Share anything anytime with your closest neighbors")}
        </p>
      )}
    </div>
  );
}


