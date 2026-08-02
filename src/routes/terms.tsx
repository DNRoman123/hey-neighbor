import { createFileRoute } from "@tanstack/react-router";
import { PhoneShell } from "@/components/PhoneShell";
import { TopBar } from "@/components/TopBar";
import { FOOD_DISCLAIMER, EXTRA_CLAIM_FEE_CENTS, FREE_CLAIM_LIMIT } from "@/lib/db";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Hey Neighbor" },
      {
        name: "description",
        content:
          "The rules for sharing unopened packaged food on Hey Neighbor, including claims, fees and safety.",
      },
      { property: "og:title", content: "Terms of Service — Hey Neighbor" },
      {
        property: "og:description",
        content: "How sharing, claiming and the €1 extra-claim fee work on Hey Neighbor.",
      },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsScreen,
});

function TermsScreen() {
  return (
    <PhoneShell>
      <TopBar title="Terms of Service" subtitle="Last updated August 2026" backTo="/" />
      <div className="space-y-5 px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-sm font-bold text-foreground">Using Hey Neighbor</h2>
          <p className="mt-1">
            Hey Neighbor connects neighbors within 1 km so unopened packaged food can find a second home
            instead of a bin. You need a verified email address and an accurate pickup area to take part.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">What may be shared</h2>
          <p className="mt-1">
            Only unopened, shop-packaged food with a readable best before date. {FOOD_DISCLAIMER} Listings
            that break this rule are removed and repeat breaches end in account closure.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">Sharing, claiming and fees</h2>
          <p className="mt-1">
            Sharing your own items is always free. Receivers get {FREE_CLAIM_LIMIT} free claims each calendar month; every extra
            claim costs €{(EXTRA_CLAIM_FEE_CENTS / 100).toFixed(2)}, paid securely through our payment
            provider. Fees cover running the platform and are non-refundable once a claim is confirmed.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">Safety and responsibility</h2>
          <p className="mt-1">
            Neighbors share food directly with each other. Check packaging and dates before eating anything,
            meet in a place you feel comfortable, and report anything that looks unsafe from the item page.
          </p>
        </section>
      </div>
    </PhoneShell>
  );
}
