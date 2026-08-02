import type { ReactNode } from "react";
import { Utensils, Armchair, Shirt } from "lucide-react";
import { AppDescription } from "@/components/AppDescription";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

export function StatusBar({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const color = tone === "light" ? "text-primary-foreground" : "text-foreground";
  return (
    <div className={`flex items-center justify-between px-6 pt-3 pb-1 text-[13px] font-semibold ${color}`}>
      <span className="text-[12px] font-semibold tracking-tight">Enjoy Sharing</span>
      <LanguageToggle tone={tone === "light" ? "light" : "default"} />
      <div className="flex items-center gap-1.5">
        <Utensils className="size-3.5" strokeWidth={2.5} />
        <Armchair className="size-3.5" strokeWidth={2.5} />
        <Shirt className="size-3.5" strokeWidth={2.5} />
      </div>
    </div>
  );
}


export function PhoneShell({
  children,
  statusTone = "dark",
  hasNav = false,
  className = "",
}: {
  children: ReactNode;
  statusTone?: "dark" | "light";
  hasNav?: boolean;
  className?: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background">
      <StatusBar tone={statusTone} />
      <div className="flex justify-center pt-3 pb-1">
        <Logo size="sm" tone={statusTone === "light" ? "light" : "default"} />
      </div>
      <main className={`flex flex-1 flex-col ${hasNav ? "pb-24" : "pb-8"} ${className}`}>
        {children}
        <AppDescription tone={statusTone} />
        <div
          className={`px-4 py-4 text-center text-[11px] ${
            statusTone === "light" ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          © 2026 Hey Neighbor
        </div>
      </main>
    </div>
  );
}

