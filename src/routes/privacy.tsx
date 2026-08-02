import { createFileRoute } from "@tanstack/react-router";
import { PhoneShell } from "@/components/PhoneShell";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Hey Neighbor" },
      {
        name: "description",
        content:
          "What data Hey Neighbor stores, how your location and photos are used, and how to delete it all.",
      },
      { property: "og:title", content: "Privacy Policy — Hey Neighbor" },
      {
        property: "og:description",
        content: "How Hey Neighbor handles your profile, location and chats.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyScreen,
});

function PrivacyScreen() {
  return (
    <PhoneShell>
      <TopBar title="Privacy Policy" subtitle="Last updated August 2026" backTo="/" />
      <div className="space-y-5 px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-sm font-bold text-foreground">What we store</h2>
          <p className="mt-1">
            Your email address, profile name, optional phone number, avatar, pickup address and the listings,
            claims and messages you create. Payment card details are never stored by Hey Neighbor — they stay
            with our payment provider.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">Location</h2>
          <p className="mt-1">
            We use your device location, or your saved address if you prefer, only to work out which listings
            sit within your 1 km radius. Other neighbors see an approximate area label and a distance, never
            your exact address.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">Photos and chats</h2>
          <p className="mt-1">
            Item photos and chat images are kept in private storage and shown only to signed-in neighbors
            involved in that listing or conversation.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">Your choices</h2>
          <p className="mt-1">
            You can edit or clear your profile details at any time, turn notifications off in your browser or
            phone settings, and ask us to delete your account and all related data.
          </p>
        </section>
      </div>
    </PhoneShell>
  );
}
