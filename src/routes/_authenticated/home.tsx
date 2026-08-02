import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Bell,
  MapPin,
  Home as HomeIcon,
  MessageCircle,
  Loader2,
  ShieldCheck,
  Plus,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { PhoneShell } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { ListingPhoto } from "@/components/ListingPhoto";
import { useUserId } from "@/hooks/useAuth";
import {
  FOOD_DISCLAIMER,
  fetchIsAdmin,
  fetchMyProfile,
  fetchNearby,
  formatBestBefore,
  formatDistance,
  neighborName,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Nearby Neighbors — Hey Neighbor" },
      {
        name: "description",
        content: "Browse unopened food shared by neighbors within 1 km of you and arrange a pickup.",
      },
      { property: "og:title", content: "Nearby Neighbors — Hey Neighbor" },
      { property: "og:description", content: "Items from neighbors within 1 km of you." },
      { property: "og:url", content: "/home" },
    ],
    links: [{ rel: "canonical", href: "/home" }],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const t = useT();
  const userId = useUserId();
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGpsDenied(true),
      { timeout: 8000 },
    );
  }, []);

  const profileQuery = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: () => fetchMyProfile(userId!),
    enabled: Boolean(userId),
  });

  const adminQuery = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => fetchIsAdmin(userId!),
    enabled: Boolean(userId),
  });

  const priv = profileQuery.data?.priv;
  const radiusKm = Number(priv?.radius_km ?? 1);
  const lat = gps?.lat ?? priv?.lat ?? null;
  const lng = gps?.lng ?? priv?.lng ?? null;
  const ready = Boolean(gps) || gpsDenied || profileQuery.isFetched;

  const listingsQuery = useQuery({
    queryKey: ["nearby", lat, lng, radiusKm],
    queryFn: () => fetchNearby(lat, lng, radiusKm),
    enabled: ready,
  });

  const source = gps
    ? t("your current location")
    : lat != null
      ? t("your saved address")
      : t("everywhere");

  return (
    <>
      <PhoneShell hasNav>
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pt-2 pb-3">
          {adminQuery.data ? (
            <Link to="/admin" aria-label={t("Admin dashboard")}>
              <ShieldCheck className="size-6 text-primary" strokeWidth={2.2} />
            </Link>
          ) : (
            <span />
          )}
          <div className="text-center">
            <h1 className="text-base font-bold">{t("Nearby Neighbors")}</h1>
            <p className="flex items-center justify-center gap-1 text-xs font-semibold text-primary">
              <MapPin className="size-3.5" /> {t("Within {radius} km of you").replace("{radius}", String(radiusKm))}
            </p>
          </div>
          <Link to="/listings" aria-label={t("Notifications")} className="flex justify-end">
            <Bell className="size-6" strokeWidth={2.2} />
          </Link>
        </div>

        <div className="px-4">
          <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-secondary">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                backgroundSize: "34px 34px",
              }}
              aria-hidden
            />
            <div className="absolute size-32 rounded-full bg-primary-soft" aria-hidden />
            <span className="relative flex size-12 items-center justify-center rounded-full bg-primary shadow-float">
              <HomeIcon className="size-6 text-primary-foreground" strokeWidth={2.4} />
            </span>
            <p className="absolute bottom-3 rounded-full bg-card/90 px-3 py-1 text-[11px] font-semibold text-primary-deep">
              {t("Matching from {source}").replace("{source}", source)}
            </p>
          </div>
        </div>

        <div className="px-5 pt-6 pb-3">
          <h2 className="text-sm font-extrabold">{t("Items from your neighbors")}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-muted-foreground">
            <ShieldAlert className="mt-px size-3.5 shrink-0 text-primary" />
            {t(FOOD_DISCLAIMER)}
          </p>
        </div>

        {listingsQuery.isPending && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("Finding items nearby…")}
          </p>
        )}

        {listingsQuery.data?.length === 0 && (
          <div className="mx-4 rounded-2xl bg-secondary p-5 text-center">
            <p className="text-sm font-bold">{t("Nothing nearby just yet")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Widen your radius in your profile, or be the first to share something.")}
            </p>
            <Link
              to="/share"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground"
            >
              <Plus className="size-4" strokeWidth={2.6} /> {t("Share an item")}
            </Link>
          </div>
        )}

        <ul className="space-y-3 px-4">
          {(listingsQuery.data ?? []).map((item) => (
            <li key={item.id}>
              <Link
                to="/item/$id"
                params={{ id: item.id }}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
              >
                <ListingPhoto
                  path={item.photo_url}
                  alt={item.title}
                  className="size-20 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {neighborName(item.owner_first_name, item.owner_last_name)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDistance(item.distance_km)}</p>
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
                <MessageCircle
                  aria-label={t("Open this listing to message the neighbor")}
                  className="size-6 shrink-0 text-primary"
                  strokeWidth={2}
                />

              </Link>
            </li>
          ))}
        </ul>
      </PhoneShell>
      <BottomNav />
    </>
  );
}
