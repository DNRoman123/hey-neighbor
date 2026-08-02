import { createFileRoute } from "@tanstack/react-router";
import { PhoneShell } from "@/components/PhoneShell";
import { TopBar } from "@/components/TopBar";
import { ListingForm } from "@/components/ListingForm";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/share/")({
  head: () => ({
    meta: [
      { title: "Share an item — Hey Neighbor" },
      {
        name: "description",
        content:
          "Add a photo, category and description for the item you want to pass on to a neighbor nearby.",
      },
      { property: "og:title", content: "Share an item — Hey Neighbor" },
      { property: "og:description", content: "Give household items a second home in one step." },
      { property: "og:url", content: "/share" },
    ],
    links: [{ rel: "canonical", href: "/share" }],
  }),
  component: UploadScreen,
});

function UploadScreen() {
  const t = useT();
  return (
    <PhoneShell>
      <TopBar
        title={t("Neighbor Sharing")}
        subtitle={t("Give it a second home nearby")}
        backTo="/listings"
      />
      <ListingForm />
    </PhoneShell>
  );
}
