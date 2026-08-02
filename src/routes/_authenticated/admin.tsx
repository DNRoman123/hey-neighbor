import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { ListingPhoto } from "@/components/ListingPhoto";
import { useUserId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchIsAdmin, formatExpiry, neighborName } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Hey Neighbor" },
      {
        name: "description",
        content: "Moderate neighbors, listings, reports and extra-claim payments across Hey Neighbor.",
      },
      { property: "og:title", content: "Admin dashboard — Hey Neighbor" },
      { property: "og:description", content: "Community moderation and payment overview." },
      { property: "og:url", content: "/admin" },
    ],
    links: [{ rel: "canonical", href: "/admin" }],
  }),
  component: AdminScreen,
});

const tabs = ["users", "listings", "reports", "payments"] as const;
type Tab = (typeof tabs)[number];

function AdminScreen() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("users");

  const isAdmin = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => fetchIsAdmin(userId!),
    enabled: Boolean(userId),
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, is_suspended, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin.data === true,
  });

  const listings = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, condition, expires_on, photo_url, status, owner_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin.data === true,
  });

  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, reason, status, listing_id, message_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin.data === true,
  });

  const payments = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, user_id, amount_cents, currency, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin.data === true,
  });

  async function toggleSuspend(id: string, next: boolean) {
    const { error } = await supabase.from("profiles").update({ is_suspended: next }).eq("id", id);
    if (error) toast.error("Could not update that neighbor.");
    else {
      toast.success(next ? "Neighbor suspended." : "Neighbor reinstated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  }

  async function removeListing(id: string) {
    const { error } = await supabase.from("listings").update({ status: "removed" }).eq("id", id);
    if (error) toast.error("Could not remove that listing.");
    else {
      toast.success("Listing removed.");
      queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    }
  }

  async function resolveReport(id: string) {
    const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    if (error) toast.error("Could not resolve that report.");
    else {
      toast.success("Report resolved.");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    }
  }

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
          <p className="mt-1 text-xs text-muted-foreground">
            Your account doesn&apos;t have moderation access.
          </p>
          <Link to="/home" className="mt-4 inline-block text-sm font-bold text-primary">
            Back to nearby items
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const totalRevenue = (payments.data ?? [])
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <PhoneShell>
      <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pt-2 pb-3">
        <Link to="/home" aria-label="Go back" className="flex size-10 items-center justify-center -ml-2">
          <ChevronLeft className="size-6" strokeWidth={2.4} />
        </Link>
        <div className="text-center">
          <h1 className="text-base font-bold">Admin dashboard</h1>
          <p className="text-xs text-muted-foreground">Community health at a glance</p>
        </div>
        <span />
      </div>

      <div className="grid grid-cols-3 gap-2 px-4">
        {[
          { label: "Neighbors", value: users.data?.length ?? 0 },
          { label: "Listings", value: listings.data?.length ?? 0 },
          { label: "Revenue", value: `€${(totalRevenue / 100).toFixed(2)}` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-secondary p-3 text-center">
            <p className="text-base font-extrabold text-primary-deep">{card.value}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-primary-deep"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 px-4">
        {tab === "users" &&
          (users.data ?? []).map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">
                  {neighborName(u.first_name, u.last_name)}
                  {u.username ? ` · @${u.username}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => toggleSuspend(u.id, !u.is_suspended)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                  u.is_suspended ? "bg-primary text-primary-foreground" : "bg-secondary text-primary-deep"
                }`}
              >
                {u.is_suspended ? "Reinstate" : "Suspend"}
              </button>
            </div>
          ))}

        {tab === "listings" &&
          (listings.data ?? []).map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
              <ListingPhoto
                path={l.photo_url}
                alt={l.title}
                className="size-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {l.status} · {formatExpiry(l.expires_on)}
                </p>
              </div>
              {l.status !== "removed" && (
                <button
                  onClick={() => removeListing(l.id)}
                  className="shrink-0 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-primary-deep"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

        {tab === "reports" &&
          (reports.data ?? []).map((r) => (
            <div key={r.id} className="rounded-2xl bg-card p-3 shadow-card">
              <p className="text-[13px] font-bold">{r.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.listing_id ? "Listing report" : "Message report"} ·{" "}
                {new Date(r.created_at).toLocaleDateString()} · {r.status}
              </p>
              {r.status === "open" && (
                <button
                  onClick={() => resolveReport(r.id)}
                  className="mt-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground"
                >
                  Mark resolved
                </button>
              )}
            </div>
          ))}

        {tab === "payments" &&
          (payments.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
              <div>
                <p className="text-[13px] font-bold">
                  €{(p.amount_cents / 100).toFixed(2)} {p.currency}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()} · {p.status}
                </p>
              </div>
            </div>
          ))}

        {tab === "reports" && reports.data?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No reports — the community is calm.</p>
        )}
        {tab === "payments" && payments.data?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No extra-claim payments yet.</p>
        )}
      </div>
    </PhoneShell>
  );
}
