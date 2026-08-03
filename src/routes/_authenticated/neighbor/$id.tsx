import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Loader2, MessageCircle, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { Button } from "@/components/ui/button";
import { Avatar, ListingPhoto } from "@/components/ListingPhoto";
import { useUserId } from "@/hooks/useAuth";
import { fetchNeighbor, formatBestBefore, neighborName, openDirectConversation } from "@/lib/db";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/neighbor/$id")({
  head: () => ({
    meta: [
      { title: "Neighbor profile — Hey Neighbor" },
      {
        name: "description",
        content: "See a neighbor's profile, everything they're sharing right now, and start a chat.",
      },
      { property: "og:title", content: "Neighbor profile — Hey Neighbor" },
      { property: "og:description", content: "Browse a neighbor's current items or say hello." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NeighborScreen,
});

function NeighborScreen() {
  const t = useT();
  const { id } = Route.useParams();
  const userId = useUserId();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const neighbor = useQuery({ queryKey: ["neighbor", id], queryFn: () => fetchNeighbor(id) });

  async function handleChat() {
    if (!userId) return;
    setBusy(true);
    try {
      const conversationId = await openDirectConversation(id, userId);
      navigate({ to: "/chat/$id", params: { id: conversationId } });
    } catch (error) {
      console.error(error);
      toast.error(t("Could not open the chat."));
    } finally {
      setBusy(false);
    }
  }

  if (neighbor.isPending) {
    return (
      <PhoneShell>
        <p className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("Loading…")}
        </p>
      </PhoneShell>
    );
  }

  const profile = neighbor.data?.profile;
  if (!profile) {
    return (
      <PhoneShell>
        <div className="px-6 pt-10 text-center">
          <p className="text-sm font-bold">{t("This neighbor is no longer available.")}</p>
          <Link to="/home" className="mt-4 inline-block text-sm font-bold text-primary">
            {t("Back to nearby items")}
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const name = neighborName(profile.first_name, profile.last_name);
  const listings = neighbor.data?.listings ?? [];
  const isMe = profile.id === userId;

  return (
    <PhoneShell>
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pt-2 pb-3">
        <button
          type="button"
          aria-label={t("Go back")}
          onClick={() => navigate({ to: "/home" })}
          className="-ml-2 flex size-10 items-center justify-center"
        >
          <ChevronLeft className="size-6" strokeWidth={2.4} />
        </button>
        <p className="text-center text-base font-bold">{t("Neighbor")}</p>
        <span />
      </div>

      <div className="flex flex-col items-center px-5 pt-2 text-center">
        <Avatar path={profile.avatar_url} alt={name} className="size-20 rounded-full object-cover" />
        <h1 className="mt-3 text-lg font-extrabold">{name}</h1>
        {profile.username ? <p className="text-xs text-muted-foreground">@{profile.username}</p> : null}
        <p className="mt-1 text-xs text-muted-foreground">{profile.area_label ?? t("Nearby")}</p>

        {!isMe && (
          <Button
            size="lg"
            disabled={busy}
            onClick={handleChat}
            className="mt-4 h-12 w-full rounded-xl text-[15px] font-bold"
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageCircle className="mr-2 size-4" />}
            {t("Chat with {name}").replace("{name}", name.split(" ")[0] ?? "")}
          </Button>
        )}
      </div>

      <section className="mt-6 px-4 pb-8">
        <h2 className="text-sm font-extrabold">{t("Currently sharing")}</h2>
        {listings.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-card p-4 text-center text-xs text-muted-foreground shadow-card">
            {t("Nothing shared right now.")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {listings.map((item) => (
              <li key={item.id}>
                <Link
                  to="/item/$id"
                  params={{ id: item.id }}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
                >
                  <ListingPhoto
                    path={item.photo_url}
                    alt={item.title}
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{t(item.category)}</p>
                    {item.category === "Unopened Food" && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-extrabold text-primary-foreground">
                        <PackageCheck className="size-3" strokeWidth={2.8} /> {t("Unopened")}
                      </span>
                    )}
                    {item.category === "Unopened Food" && item.best_before && (
                      <span className="mt-1 block text-[11px] font-bold text-primary-deep">
                        {formatBestBefore(item.best_before)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PhoneShell>
  );
}
