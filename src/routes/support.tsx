import { createFileRoute } from "@tanstack/react-router";
import { PhoneShell } from "@/components/PhoneShell";
import { TopBar } from "@/components/TopBar";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Hey Neighbor" },
      {
        name: "description",
        content:
          "Get help with Hey Neighbor: account issues, listings, payments, safety, and neighborhood sharing.",
      },
      { property: "og:title", content: "Support — Hey Neighbor" },
      {
        property: "og:description",
        content: "Contact and support information for the Hey Neighbor app.",
      },
      { property: "og:url", content: "/support" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: SupportScreen,
});

function SupportScreen() {
  return (
    <PhoneShell>
      <TopBar title="Support" subtitle="We’re here to help" backTo="/" />
      <div className="space-y-5 px-6 pb-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-sm font-bold text-foreground">Contact us</h2>
          <p className="mt-1">
            Email:{" "}
            <a
              href="mailto:davidnroman@hotmail.com"
              className="text-primary underline underline-offset-2"
            >
              davidnroman@hotmail.com
            </a>
          </p>
          <p className="mt-1">We aim to reply within 1–2 business days.</p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">Common topics</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Account, login, and profile questions</li>
            <li>Posting, editing, or deleting an item</li>
            <li>Claims, payments, and the monthly free limit</li>
            <li>Reporting inappropriate listings or users</li>
            <li>Blocking another neighbor</li>
            <li>Location and notification settings</li>
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">Safety</h2>
          <p className="mt-1">
            If you feel unsafe at any time, stop the exchange and use the in-app report or block
            options. For emergencies, contact your local authorities.
          </p>
        </section>
        <section>
          <h2 className="text-sm font-bold text-foreground">More info</h2>
          <p className="mt-1">
            Visit our{" "}
            <a href="/privacy" className="text-primary underline underline-offset-2">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-primary underline underline-offset-2">
              Terms of Service
            </a>{" "}
            for details on how the app works.
          </p>
        </section>
      </div>
    </PhoneShell>
  );
}
