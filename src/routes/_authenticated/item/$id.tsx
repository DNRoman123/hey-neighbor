import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Check,
  ChevronLeft,
  Flag,
  Hourglass,
  Loader2,
  Lock,
  MessageCircle,
  PackageCheck,
  HandHeart,
  Share2,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { PhoneShell } from "@/components/PhoneShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, ListingPhoto } from "@/components/ListingPhoto";
import { useUserId } from "@/hooks/useAuth";
import {
  FOOD_DISCLAIMER,
  FREE_CLAIM_LIMIT,
  acceptItemAsReceiver,
  blockUser,
  fetchFreeClaimsUsed,
  fetchListing,
  fetchMyClaim,
  markListingGiven,
  formatBestBefore,
  neighborName,
  openConversation,
  reportContent,
} from "@/lib/db";



export const Route = createFileRoute("/_authenticated/item/$id")({
  loader: async ({ params, context }) => {
    try {
      return await context.queryClient.ensureQueryData({
        queryKey: ["listing", params.id],
        queryFn: () => fetchListing(params.id),
      });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const listing = loaderData ?? null;
    const name = listing?.title ?? "Shared item";
    const title = `${name} — Hey Neighbor`.slice(0, 60);
    const description = (
      listing
        ? `${listing.description || listing.condition || "An item"} a neighbor is passing on within 1 km.`
        : "See the details of an item a neighbor is passing on, and say you're interested."
    ).slice(0, 158);
    const path = `/item/${params.id}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: `Hey Neighbor: ${name}` },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: path },
      ],
      links: [{ rel: "canonical", href: path }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            description,
            category: listing?.category ?? "Unopened Food",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
            },
          }),
        },
      ],
    };
  },
  component: ItemScreen,
});


function ItemScreen() {
  const t = useT();
  const { id } = Route.useParams();
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"claim" | "chat" | "given" | null>(null);
  const [agreed, setAgreed] = useState(false);

  const item = useQuery({ queryKey: ["listing", id], queryFn: () => fetchListing(id) });
  const myClaim = useQuery({
    queryKey: ["my-claim", id, userId],
    queryFn: () => fetchMyClaim(id, userId!),
    enabled: Boolean(userId),
  });
  const freeUsed = useQuery({
    queryKey: ["free-claims", userId],
    queryFn: () => fetchFreeClaimsUsed(userId!),
    enabled: Boolean(userId),
  });


  if (item.isPending) {
    return (
      <PhoneShell>
        <p className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("Loading item…")}
        </p>
      </PhoneShell>
    );
  }

  if (!item.data) {
    return (
      <PhoneShell>
        <div className="px-6 pt-10 text-center">
          <p className="text-sm font-bold">{t("This item is no longer available.")}</p>
          <Link to="/home" className="mt-4 inline-block text-sm font-bold text-primary">
            {t("Back to nearby items")}
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const listing = item.data;
  const owner = listing.owner;
  const displayName = neighborName(owner?.first_name, owner?.last_name);
  const isMine = listing.owner_id === userId;

  const claim = myClaim.data;
  const nextIsPaid = (freeUsed.data ?? 0) >= FREE_CLAIM_LIMIT;
  // A receiver must first tick the acceptance box (which registers the claim and
  // uses one of their monthly items) before they can chat or coordinate a pickup.
  // If the €1 fee is due, chat stays closed until it is paid.
  const hasAccepted = Boolean(claim?.receiver_accepted_at);
  const chatAllowed = isMine || (hasAccepted && claim?.status !== "pending_payment");
  const chatLocked = !chatAllowed;


  async function handleAccept() {
    if (!userId || !agreed) return;
    setBusy("claim");
    try {
      const created = await acceptItemAsReceiver(listing.id, listing.owner_id, userId);
      queryClient.invalidateQueries({ queryKey: ["my-claim", listing.id, userId] });
      if (created.status === "pending_payment") {
        navigate({ to: "/pay/$claimId", params: { claimId: created.id } });
        return;
      }
      toast.success(
        t("{name} has to agree too — we've let them know.").replace("{name}", displayName.split(" ")[0] ?? ""),
      );
      const conversationId = await openConversation(listing.id, listing.owner_id, userId);
      navigate({ to: "/chat/$id", params: { id: conversationId } });
    } catch (error) {
      console.error(error);
      toast.error(t("Could not accept this item. Please try again."));
    } finally {
      setBusy(null);
    }
  }


  async function handleChat() {
    if (!userId) return;
    setBusy("chat");
    try {
      const conversationId = await openConversation(listing.id, listing.owner_id, userId);
      navigate({ to: "/chat/$id", params: { id: conversationId } });
    } catch (error) {
      console.error(error);
      toast.error(t("Could not open the chat."));
    } finally {
      setBusy(null);
    }
  }

  async function handleGiven() {
    setBusy("given");
    try {
      await markListingGiven(listing.id);
      queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
      queryClient.invalidateQueries({ queryKey: ["my-listings", userId] });
      queryClient.invalidateQueries({ queryKey: ["nearby"] });
      toast.success(t("Marked as given to your neighbor."));
    } catch (error) {
      console.error(error);
      toast.error(t("Could not mark that item as given."));
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/item/${listing.id}`;
    const nav: Navigator = window.navigator;
    async function copyLink() {
      await nav.clipboard.writeText(url);
      toast.success(t("Link copied — share it with anyone."));
    }
    try {
      if (typeof nav.share === "function") {
        await nav.share({
          title: listing.title,
          text: t("Check out this item shared on Hey Neighbor:") + ` ${listing.title}`,
          url,
        });
        return;
      }
      await copyLink();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      try {
        await copyLink();
      } catch {
        toast.error(t("Could not share this item."));
      }
    }
  }


  async function handleReport() {
    if (!userId) return;
    try {
      await reportContent(userId, "Reported from item page", { listingId: listing.id });
      toast.success(t("Thanks — our team will review this listing."));
    } catch {
      toast.error(t("Could not send that report."));
    }
  }

  async function handleBlock() {
    if (!userId) return;
    try {
      await blockUser(userId, listing.owner_id);
      queryClient.invalidateQueries({ queryKey: ["nearby"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users", userId] });
      toast.success(t("Neighbor blocked. You won't see each other in the app."));
      navigate({ to: "/home" });
    } catch {
      toast.error(t("Could not block this neighbor."));
    }
  }

  return (
    <PhoneShell>
      <div className="grid grid-cols-[2.5rem_1fr_6rem] items-center px-4 pt-2 pb-4">
        <Link to="/home" aria-label={t("Go back")} className="flex size-10 items-center justify-center -ml-2">
          <ChevronLeft className="size-6" strokeWidth={2.4} />
        </Link>
        <div className="flex items-center justify-center gap-2">
          <Avatar path={owner?.avatar_url} alt={displayName} className="size-9 rounded-full object-cover" />
          <div className="leading-tight">
            <p className="text-sm font-bold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{listing.area_label ?? t("Nearby")}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button aria-label={t("Share this item")} onClick={handleShare}>
            <Share2 className="size-5 text-primary" />
          </button>
          <button aria-label={t("Report listing")} onClick={handleReport}>
            <Flag className="size-5 text-muted-foreground" />
          </button>
          {!isMine && (
            <AlertDialog>
              <AlertDialogTrigger aria-label={t("Block neighbor")}>
                <UserX className="size-5 text-muted-foreground" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Block this neighbor?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "They won't be able to message you and you won't see each other's items. You can unblock them later from your profile.",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBlock}>{t("Block")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>


      <div className="relative px-4">
        <ListingPhoto
          path={listing.photo_url}
          alt={listing.title}
          className="h-64 w-full rounded-2xl object-cover"
        />
        {listing.category === "Unopened Food" && (
          <span className="absolute left-6 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[12px] font-extrabold text-primary-foreground shadow-float">
            <PackageCheck className="size-3.5" strokeWidth={2.6} /> {t("Unopened")}
          </span>
        )}
      </div>

      <div className="px-5 pt-5">
        <h1 className="text-lg font-extrabold">{listing.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(listing.condition)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-block rounded-md bg-secondary px-2.5 py-1 text-[12px] font-bold text-primary-deep">
            {t(listing.category)}
          </span>
          {listing.category === "Unopened Food" && listing.best_before && (
            <span className="inline-block rounded-md bg-primary-soft px-2.5 py-1 text-[12px] font-bold text-primary-deep">
              {formatBestBefore(listing.best_before)}
            </span>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <h2 className="text-sm font-bold">{t("Description")}</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {listing.description || t("No description added.")}
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={handleShare}
          className="mt-5 h-12 w-full rounded-xl border-primary/40 text-[15px] font-bold text-primary"
        >
          <Share2 className="mr-2 size-4" /> {t("Share this item")}
        </Button>
      </div>


      {isMine ? (
        <div className="mt-6 space-y-3 px-5">
          <p className="text-center text-sm text-muted-foreground">{t("This is your own listing.")}</p>
          {listing.status === "collected" ? (
            <p className="flex items-center justify-center gap-2 text-[13px] font-bold text-primary">
              <Check className="size-4" strokeWidth={3} /> {t("Given to my neighbor")}
            </p>
          ) : (
            <Button
              size="lg"
              disabled={busy !== null}
              onClick={handleGiven}
              className="h-13 w-full rounded-xl text-[15px] font-bold"
            >
              {busy === "given" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <HandHeart className="mr-2 size-4" />
              )}
              {t("Given to my neighbor")}
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3 px-4">
          {chatLocked ? (
            <div className="rounded-2xl bg-primary-soft p-4 text-center">
              <Lock className="mx-auto size-5 text-primary" />
              <p className="mt-2 text-[13px] font-semibold leading-snug text-primary-deep">
                {claim?.status === "pending_payment"
                  ? t(
                      "Your {limit} free items this month are used. Pay €1.00 for this item to chat with your neighbor — browsing stays free.",
                    ).replace("{limit}", String(FREE_CLAIM_LIMIT))
                  : t(
                      "Tick the box below and accept this item to unlock the chat. Chatting and arranging a pickup uses one of your monthly items.",
                    )}
              </p>
            </div>
          ) : (

            <Button
              size="lg"
              variant="outline"
              disabled={busy !== null}
              onClick={handleChat}
              className="h-13 w-full rounded-xl border-primary/40 text-[15px] font-bold text-primary"
            >
              {busy === "chat" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 size-4" />
              )}
              {t("Chat with {name}").replace("{name}", displayName.split(" ")[0] ?? "")}
            </Button>
          )}

          {claim ? (
            <div className="rounded-2xl bg-primary-soft p-4">
              {claim.status === "awaiting_owner" && (
                <p className="flex items-start gap-2 text-[13px] font-semibold leading-snug text-primary-deep">
                  <Hourglass className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t(
                    "You accepted this item. Waiting for {name} to agree — it only counts once you both agree.",
                  ).replace("{name}", displayName.split(" ")[0] ?? "")}
                </p>
              )}
              {claim.status === "pending_payment" && (
                <>
                  <p className="text-[13px] font-semibold leading-snug text-primary-deep">
                    {t(
                      "You both agreed. Your {limit} free items this month are used, so this one costs €1.00.",
                    ).replace("{limit}", String(FREE_CLAIM_LIMIT))}
                  </p>
                  <Button
                    size="lg"
                    onClick={() => navigate({ to: "/pay/$claimId", params: { claimId: claim.id } })}
                    className="mt-3 h-12 w-full rounded-xl text-[15px] font-bold"
                  >
                    {t("Pay €1.00")}
                  </Button>
                </>
              )}
              {(claim.status === "confirmed" || claim.status === "completed") && (
                <p className="flex items-start gap-2 text-[13px] font-semibold leading-snug text-primary-deep">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} />
                  {t("You both agreed — this item is yours to collect.")}
                </p>
              )}
            </div>
          ) : (
            <>
              <label className="flex items-start gap-3 rounded-2xl bg-secondary p-4 text-left">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(value) => setAgreed(value === true)}
                  className="mt-0.5"
                  aria-label={t("Accept item")}
                />
                <span className="text-[13px] font-semibold leading-snug text-primary-deep">
                  {t("I accept this item and agree to collect it from {name}.").replace(
                    "{name}",
                    displayName.split(" ")[0] ?? "",
                  )}
                  {nextIsPaid
                    ? " " +
                      t(
                        "My {limit} free items this month are used, so this one costs €1.00 once we both agree.",
                      ).replace("{limit}", String(FREE_CLAIM_LIMIT))
                    : " " +
                      t("It counts toward my {limit} free items this month only once {name} agrees too.")
                        .replace("{limit}", String(FREE_CLAIM_LIMIT))
                        .replace("{name}", displayName.split(" ")[0] ?? "")}
                </span>
              </label>
              <Button
                size="lg"
                disabled={busy !== null || !agreed}
                onClick={handleAccept}
                className="h-13 w-full rounded-xl text-[15px] font-bold"
              >
                {busy === "claim" && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Accept item")}
              </Button>
            </>
          )}

        </div>
      )}

      {listing.category === "Unopened Food" && (
        <p className="mt-6 flex items-start gap-2 px-5 text-[12px] font-semibold leading-snug text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          {t(FOOD_DISCLAIMER)}
        </p>
      )}
    </PhoneShell>
  );
}
