import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { TopBar } from "@/components/TopBar";
import { ListingForm } from "@/components/ListingForm";
import { useUserId } from "@/hooks/useAuth";
import { fetchListing } from "@/lib/db";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/share/$id")({
  head: () => ({
    meta: [
      { title: "Edit your item — Hey Neighbor" },
      {
        name: "description",
        content: "Update the photo, category, description or pickup area of an item you're sharing.",
      },
      { property: "og:title", content: "Edit your item — Hey Neighbor" },
      { property: "og:description", content: "Keep your shared item details up to date." },
    ],
  }),
  component: EditScreen,
});

function EditScreen() {
  const t = useT();
  const { id } = Route.useParams();
  const userId = useUserId();

  const listing = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListing(id),
  });

  const data = listing.data;
  const isMine = Boolean(data && userId && data.owner_id === userId);

  return (
    <PhoneShell>
      <TopBar title={t("Edit item")} subtitle={t("Update the details anytime")} backTo="/listings" />
      {listing.isPending ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("Loading…")}
        </p>
      ) : !data || !isMine ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
          <p>{t("You can only edit your own items.")}</p>
          <Link to="/listings" className="mt-3 inline-block font-bold text-primary">
            {t("My Listings")}
          </Link>
        </div>
      ) : (
        <ListingForm
          listing={{
            id: data.id,
            title: data.title,
            description: data.description,
            condition: data.condition,
            category: data.category,
            best_before: data.best_before,
            photo_url: data.photo_url,
            area_label: data.area_label,
          }}
        />
      )}
    </PhoneShell>
  );
}
