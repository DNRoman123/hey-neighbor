import { Link } from "@tanstack/react-router";
import { Home, ClipboardList, MessageCircle, User } from "lucide-react";
import { useT } from "@/lib/i18n";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/listings", label: "My Listings", icon: ClipboardList },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const t = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] border-t border-border bg-card/95 backdrop-blur">
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-4">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex w-20 flex-col items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-5" strokeWidth={isActive ? 2.6 : 2} />
                  <span>{t(label)}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
