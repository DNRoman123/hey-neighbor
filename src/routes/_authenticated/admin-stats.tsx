import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2, ShieldCheck } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { useUserId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchIsAdmin, neighborName } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin-stats")({
  head: () => ({
    meta: [
      { title: "App statistics — Hey Neighbor" },
      {
        name: "description",
        content: "Private admin analytics for Hey Neighbor: signups, listings, claims, chats and per-neighbor spend.",
      },
      { property: "og:title", content: "App statistics — Hey Neighbor" },
      { property: "og:description", content: "Private admin analytics dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminStatsScreen,
});

const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };
function money(cents: number, currency: string) {
  return `${SYMBOLS[currency] ?? ""}${(cents / 100).toFixed(2)}`;
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

async function loadStats() {
  const [profiles, priv, listings, claims, payments, conversations, messages, reports, blocks] =
    await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, username, is_suspended, created_at"),
      supabase.from("profile_private").select("id, lat, radius_km"),
      supabase.from("listings").select("id, owner_id, status, category, created_at"),
      supabase
        .from("claims")
        .select("id, receiver_id, owner_id, status, is_free, fee_cents, currency, created_at, owner_accepted_at"),
      supabase.from("payments").select("id, user_id, amount_cents, currency, status, created_at"),
      supabase.from("conversations").select("id, created_at"),
      supabase.from("messages").select("id, sender_id, created_at"),
      supabase.from("reports").select("id, status"),
      supabase.from("blocked_users").select("id"),
    ]);

  const err =
    profiles.error ??
    listings.error ??
    claims.error ??
    payments.error ??
    conversations.error ??
    messages.error ??
    reports.error;
  if (err) throw err;

  return {
    profiles: profiles.data ?? [],
    priv: priv.data ?? [],
    listings: listings.data ?? [],
    claims: claims.data ?? [],
    payments: payments.data ?? [],
    conversations: conversations.data ?? [],
    messages: messages.data ?? [],
    reports: reports.data ?? [],
    blocks: blocks.data ?? [],
  };
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="text-lg font-extrabold leading-tight text-primary-deep">{value}</p>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AdminStatsScreen() {
  const userId = useUserId();

  const isAdmin = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => fetchIsAdmin(userId!),
    enabled: Boolean(userId),
  });

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: loadStats,
    enabled: isAdmin.data === true,
  });

  if (isAdmin.isPending) {
    return (
      <PhoneShell>
        <p className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking access…
        </p>
      </PhoneShell>
    );
  }

  if (!isAdmin.data) {
    return (
      <PhoneShell>
        <div className="px-6 pt-10 text-center">
          <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-bold">Admins only</p>
          <p className="mt-1 text-xs text-muted-foreground">This page is restricted to app administrators.</p>
          <Link to="/home" className="mt-4 inline-block text-sm font-bold text-primary">
            Back to nearby items
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const d = stats.data;

  const week = daysAgo(7);
  const month = daysAgo(30);
  const day = daysAgo(1);

  const profiles = d?.profiles ?? [];
  const listings = d?.listings ?? [];
  const claims = d?.claims ?? [];
  const payments = d?.payments ?? [];
  const messages = d?.messages ?? [];

  const paid = payments.filter((p) => p.status === "succeeded");
  const revenueByCurrency = paid.reduce<Record<string, number>>((acc, p) => {
    acc[p.currency] = (acc[p.currency] ?? 0) + p.amount_cents;
    return acc;
  }, {});

  const nameOf = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    if (!p) return "Unknown neighbor";
    const n = neighborName(p.first_name, p.last_name).trim();
    return n || (p.username ? `@${p.username}` : "Unnamed neighbor");
  };

  // Per-user spend
  const spendMap = new Map<string, { cents: number; currency: string; count: number }>();
  for (const p of paid) {
    const cur = spendMap.get(p.user_id) ?? { cents: 0, currency: p.currency, count: 0 };
    cur.cents += p.amount_cents;
    cur.count += 1;
    cur.currency = p.currency;
    spendMap.set(p.user_id, cur);
  }
  const spenders = [...spendMap.entries()].sort((a, b) => b[1].cents - a[1].cents);

  // Activity leaderboards
  const givenCount = new Map<string, number>();
  listings.forEach((l) => givenCount.set(l.owner_id, (givenCount.get(l.owner_id) ?? 0) + 1));
  const topGivers = [...givenCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const claimedCount = new Map<string, number>();
  claims.forEach((c) => claimedCount.set(c.receiver_id, (claimedCount.get(c.receiver_id) ?? 0) + 1));
  const topReceivers = [...claimedCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const byCategory = listings.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1;
    return acc;
  }, {});
  const byStatus = listings.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  const agreed = claims.filter((c) => c.owner_accepted_at);
  const freeAgreed = agreed.filter((c) => c.is_free).length;
  const paidAgreed = agreed.length - freeAgreed;

  const activeSharers = new Set(listings.map((l) => l.owner_id)).size;
  const activeChatters = new Set(messages.map((m) => m.sender_id)).size;
  const withLocation = (d?.priv ?? []).filter((p) => p.lat !== null).length;

  // Signups per day, last 7 days
  const signupSeries = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(Date.now() - (6 - i) * 86_400_000);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    const count = profiles.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    }).length;
    return { label: start.toLocaleDateString(undefined, { weekday: "short" }), count };
  });
  const maxSignups = Math.max(1, ...signupSeries.map((s) => s.count));

  return (
    <PhoneShell>
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pt-2 pb-3">
        <Link to="/admin" aria-label="Go back" className="-ml-2 flex size-10 items-center justify-center">
          <ChevronLeft className="size-6" strokeWidth={2.4} />
        </Link>
        <div className="text-center">
          <h1 className="text-base font-bold">App statistics</h1>
          <p className="text-xs text-muted-foreground">Private admin overview</p>
        </div>
        <span />
      </div>

      {stats.isPending ? (
        <p className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Crunching numbers…
        </p>
      ) : stats.isError ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          Could not load statistics right now.
        </p>
      ) : (
        <div className="px-4 pb-8">
          <Section title="Neighbors">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Total neighbors" value={profiles.length} hint="Accounts created" />
              <Stat
                label="New last 24h"
                value={profiles.filter((p) => p.created_at >= day).length}
              />
              <Stat label="New last 7 days" value={profiles.filter((p) => p.created_at >= week).length} />
              <Stat label="New last 30 days" value={profiles.filter((p) => p.created_at >= month).length} />
              <Stat label="Suspended" value={profiles.filter((p) => p.is_suspended).length} />
              <Stat label="Location saved" value={withLocation} hint="Can be matched nearby" />
            </div>
          </Section>

          <Section title="Signups — last 7 days">
            <div className="flex items-end justify-between gap-1.5 rounded-2xl bg-card p-3 shadow-card">
              {signupSeries.map((s, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-primary-deep">{s.count}</span>
                  <div
                    className="w-full rounded-t-md bg-primary"
                    style={{ height: `${8 + (s.count / maxSignups) * 56}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Money">
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(revenueByCurrency).length ? (
                Object.entries(revenueByCurrency).map(([cur, cents]) => (
                  <Stat key={cur} label={`Revenue (${cur})`} value={money(cents, cur)} />
                ))
              ) : (
                <Stat label="Revenue" value="—" hint="No paid claims yet" />
              )}
              <Stat label="Paying neighbors" value={spenders.length} />
              <Stat label="Successful payments" value={paid.length} />
              <Stat
                label="Pending / failed"
                value={payments.length - paid.length}
              />
            </div>
          </Section>

          <Section title="Spend per neighbor">
            {spenders.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-center text-xs text-muted-foreground shadow-card">
                No one has paid for an extra claim yet.
              </p>
            ) : (
              <div className="space-y-2">
                {spenders.map(([uid, s]) => (
                  <div
                    key={uid}
                    className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{nameOf(uid)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.count} extra claim{s.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-extrabold text-primary-deep">
                      {money(s.cents, s.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Sharing activity">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Items shared" value={listings.length} />
              <Stat label="New items 7 days" value={listings.filter((l) => l.created_at >= week).length} />
              <Stat label="Neighbors sharing" value={activeSharers} />
              <Stat label="Requests made" value={claims.length} />
              <Stat label="Agreed handovers" value={agreed.length} />
              <Stat label="Free vs paid" value={`${freeAgreed} / ${paidAgreed}`} />
            </div>
          </Section>

          <Section title="Items by category">
            <div className="space-y-2 rounded-2xl bg-card p-3 shadow-card">
              {Object.entries(byCategory).length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">No items yet.</p>
              ) : (
                Object.entries(byCategory).map(([cat, n]) => (
                  <div key={cat} className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold">{cat}</span>
                    <span className="font-bold text-primary-deep">{n}</span>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title="Items by status">
            <div className="space-y-2 rounded-2xl bg-card p-3 shadow-card">
              {Object.entries(byStatus).length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">No items yet.</p>
              ) : (
                Object.entries(byStatus).map(([s, n]) => (
                  <div key={s} className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold capitalize">{s}</span>
                    <span className="font-bold text-primary-deep">{n}</span>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title="Conversations">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Chats started" value={(d?.conversations ?? []).length} />
              <Stat label="Messages sent" value={messages.length} />
              <Stat label="Neighbors chatting" value={activeChatters} />
              <Stat label="Messages 7 days" value={messages.filter((m) => m.created_at >= week).length} />
            </div>
          </Section>

          <Section title="Top givers">
            <div className="space-y-2">
              {topGivers.length === 0 ? (
                <p className="rounded-2xl bg-card p-4 text-center text-xs text-muted-foreground shadow-card">
                  No items shared yet.
                </p>
              ) : (
                topGivers.map(([uid, n]) => (
                  <div key={uid} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
                    <p className="truncate text-[13px] font-bold">{nameOf(uid)}</p>
                    <p className="shrink-0 text-xs font-bold text-primary-deep">{n} items</p>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title="Top receivers">
            <div className="space-y-2">
              {topReceivers.length === 0 ? (
                <p className="rounded-2xl bg-card p-4 text-center text-xs text-muted-foreground shadow-card">
                  No requests yet.
                </p>
              ) : (
                topReceivers.map(([uid, n]) => (
                  <div key={uid} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
                    <p className="truncate text-[13px] font-bold">{nameOf(uid)}</p>
                    <p className="shrink-0 text-xs font-bold text-primary-deep">{n} requests</p>
                  </div>
                ))
              )}
            </div>
          </Section>

          <Section title="Safety">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Reports total" value={(d?.reports ?? []).length} />
              <Stat
                label="Reports open"
                value={(d?.reports ?? []).filter((r) => r.status === "open").length}
              />
              <Stat label="Blocks made" value={(d?.blocks ?? []).length} />
              <Stat label="Suspended accounts" value={profiles.filter((p) => p.is_suspended).length} />
            </div>
          </Section>
        </div>
      )}
    </PhoneShell>
  );
}
