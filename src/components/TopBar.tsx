import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";

export function TopBar({
  title,
  subtitle,
  backTo,
  right,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pt-2 pb-4">
      {backTo ? (
        <Link to={backTo} aria-label={t("Go back")} className="flex size-10 items-center justify-center -ml-2">
          <ChevronLeft className="size-6" strokeWidth={2.4} />
        </Link>
      ) : (
        <span />
      )}
      <div className="text-center">
        <h1 className="text-base font-bold">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex justify-end">{right}</div>
    </div>
  );
}
