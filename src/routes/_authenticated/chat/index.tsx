import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { ListingPhoto } from "@/components/ListingPhoto";
import { useUserId } from "@/hooks/useAuth";
import {
  FREE_CLAIM_LIMIT,
  fetchConversations,
  fetchFreeClaimsUsed,
  neighborName,
} from "@/lib/db";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Chats — Hey Neighbor" },
      {
        name: "description",
        content: "Message neighbors to arrange a safe, simple pickup for the items you're sharing.",
      },
      { property: "og:title", content: "Chats — Hey Neighbor" },
      { property: "og:description", content: "Arrange pickups with your neighbors." },
      { property: "og:url", content: "/chat" },
    ],
    links: [{ rel: "canonical", href: "/chat" }],
  }),
  component: ChatList,
});

function ChatList() {
  const t = useT();
  const userId = useUserId();
  const threads = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => fetchConversations(userId!),
    enabled: Boolean(userId),
  });
  const freeUsed = useQuery({
    queryKey: ["free-claims", userId],
    queryFn: () => fetchFreeClaimsUsed(userId!),
    enabled: Boolean(userId),
  });
  const tokensLeft = Math.max(0, FREE_CLAIM_LIMIT - (freeUsed.data ?? 0));

  return (
    <>
      <PhoneShell hasNav>
        <TopBar
          title={t("Chat")}
          subtitle={`${tokensLeft} ${t("of")} ${FREE_CLAIM_LIMIT} ${t("free items left this month")}`}
        />


        {threads.isPending && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("Loading chats…")}
          </p>
        )}

        {threads.data?.length === 0 && (
          <p className="px-6 pt-6 text-center text-sm text-muted-foreground">
            {t("No chats yet. Tap “I'm interested” on an item to start one.")}
          </p>
        )}

        <ul className="divide-y divide-border px-4">
          {(threads.data ?? []).map((c) => {
            const name = neighborName(c.person?.first_name, c.person?.last_name);
            return (
              <li key={c.id}>
                <Link to="/chat/$id" params={{ id: c.id }} className="flex items-center gap-3 py-4">
                  <ListingPhoto
                    path={c.listing?.photo_url}
                    alt={c.listing?.title ?? name}
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.last?.body ?? c.listing?.title ?? t("Say hello")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(c.last?.created_at ?? c.last_message_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PhoneShell>
      <BottomNav />
    </>
  );
}
