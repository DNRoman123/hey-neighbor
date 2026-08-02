import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Loader2, Trash2, Pencil, PackageCheck, ShieldAlert, Check, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { ListingPhoto, Avatar } from "@/components/ListingPhoto";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useUserId } from "@/hooks/useAuth";
import {
  FOOD_DISCLAIMER,
  FREE_CLAIM_LIMIT,
  deleteMyListing,
  fetchFreeClaimsUsed,
  fetchIncomingRequests,
  fetchMyListings,
  formatBestBefore,
  neighborName,
  ownerAcceptClaim,
} from "@/lib/db";
import { useT } from "@/lib/i18n";


export const Route = createFileRoute("/_authenticated/listings")({
  head: () => ({
    meta: [
      { title: "My Listings — Hey Neighbor" },
      {
        name: "description",
        content: "See the items you're sharing with neighbors and track your free monthly claims.",
      },
      { property: "og:title", content: "My Listings — Hey Neighbor" },
      { property: "og:description", content: "Track everything you're passing on." },
      { property: "og:url", content: "/listings" },
    ],
    links: [{ rel: "canonical", href: "/listings" }],
  }),
  component: ListingsScreen,
});

function ListingsScreen() {
  const t = useT();
  const userId = useUserId();
  const queryClient = useQueryClient();

  const listings = useQuery({
    queryKey: ["my-listings", userId],
    queryFn: () => fetchMyListings(userId!),
    enabled: Boolean(userId),
  });

  const claims = useQuery({
    queryKey: ["free-claims", userId],
    queryFn: () => fetchFreeClaimsUsed(userId!),
    enabled: Boolean(userId),
  });

  const requests = useQuery({
    queryKey: ["incoming-requests", userId],
    queryFn: () => fetchIncomingRequests(userId!),
    enabled: Boolean(userId),
  });

  const [agreeing, setAgreeing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);


  async function agree(claimId: string) {
    setAgreeing(claimId);
    try {
      const result = await ownerAcceptClaim(claimId);
      toast.success(
        result.status === "pending_payment"
          ? t("You agreed. Your neighbor pays €1.00 to complete it.")
          : t("You both agreed — the item is reserved for your neighbor."),
      );
      queryClient.invalidateQueries({ queryKey: ["incoming-requests", userId] });
    } catch (error) {
      console.error(error);
      toast.error(t("Could not agree to that request."));
    } finally {
      setAgreeing(null);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await deleteMyListing(id);
      toast.success(t("Item deleted."));
      setConfirmId(null);
      queryClient.invalidateQueries({ queryKey: ["my-listings", userId] });
      queryClient.invalidateQueries({ queryKey: ["incoming-requests", userId] });
    } catch (error) {
      console.error(error);
      toast.error(t("Could not delete that item."));
    } finally {
      setDeleting(null);
    }
  }


  const used = claims.data ?? 0;
  const pending = requests.data ?? [];

  return (
    <>
      <PhoneShell hasNav>
        <TopBar title={t("My Listings")} subtitle={`${used} ${t("of")} ${FREE_CLAIM_LIMIT} ${t("free claims used this month")}`} />

        {pending.length > 0 && (
          <section className="mt-5 px-4">
            <h2 className="text-sm font-extrabold">{t("Requests to agree")}</h2>
            <ul className="mt-3 space-y-3">
              {pending.map((request) => {
                const name = neighborName(
                  request.receiver?.first_name,
                  request.receiver?.last_name,
                );
                return (
                  <li key={request.id} className="rounded-2xl bg-card p-3 shadow-card">
                    <div className="flex items-center gap-3">
                      <Avatar
                        path={request.receiver?.avatar_url}
                        alt={name}
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{name} {t("accepted your item")}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {request.listing?.title ?? t("Your item")}
                        </p>
                      </div>
                    </div>
                    {request.status === "awaiting_owner" ? (
                      <Button
                        size="lg"
                        disabled={agreeing !== null}
                        onClick={() => agree(request.id)}
                        className="mt-3 h-11 w-full rounded-xl text-[14px] font-bold"
                      >
                        {agreeing === request.id ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 size-4" strokeWidth={3} />
                        )}
                        {t("I agree — hand it over")}
                      </Button>
                    ) : (
                      <p className="mt-3 flex items-start gap-2 text-[12px] font-semibold text-muted-foreground">
                        <Hourglass className="mt-0.5 size-4 shrink-0 text-primary" />
                        {t("You agreed. Waiting for")} {name.split(" ")[0]} {t("to pay the €1.00 fee.")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}


        {listings.isPending && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("Loading your items…")}
          </p>
        )}

        <ul className="mt-4 space-y-3 px-4">
          {(listings.data ?? []).map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
              <ListingPhoto
                path={item.photo_url}
                alt={item.title}
                className="size-20 shrink-0 rounded-xl object-cover"
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
                  <span className="mt-1 block rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-deep">
                    {formatBestBefore(item.best_before)}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-primary-deep">
                  {item.status === "active" ? t("Live") : item.status}
                </span>
                <Link
                  to="/share/$id"
                  params={{ id: item.id }}
                  aria-label={`${t("Edit")} ${item.title}`}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-primary"
                >
                  <Pencil className="size-4" /> {t("Edit")}
                </Link>
                <button
                  aria-label={`${t("Delete")} ${item.title}`}
                  onClick={() => setConfirmId(item.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-destructive"
                >
                  {deleting === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {t("Delete")}
                </button>

              </div>
            </li>
          ))}
        </ul>

        {listings.data?.length === 0 && (
          <p className="px-5 pt-6 text-center text-sm text-muted-foreground">
            {t("You haven't shared anything yet.")}
          </p>
        )}

        <Link
          to="/share"
          className="mx-4 mt-5 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-4 text-sm font-bold text-primary"
        >
          <Plus className="size-5" strokeWidth={2.6} /> {t("Share a new item")}
        </Link>

        <p className="mt-4 flex items-start gap-2 px-5 text-[12px] font-semibold leading-snug text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          {t(FOOD_DISCLAIMER)}
        </p>
      </PhoneShell>
      <BottomNav />
      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete this item?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("It disappears from your neighbors' feed right away. This can't be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting !== null}
              onClick={(event) => {
                event.preventDefault();
                if (confirmId) remove(confirmId);
              }}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting !== null && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

