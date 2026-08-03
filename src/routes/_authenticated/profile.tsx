import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  LogOut,
  Loader2,
  ShieldCheck,
  Languages,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { StatusBar } from "@/components/PhoneShell";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/ListingPhoto";
import { Button } from "@/components/ui/button";
import { useUserId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto, ExplicitImageError } from "@/lib/photos";
import {
  fetchBlockedUsers,
  fetchFreeClaimsUsed,
  fetchIsAdmin,
  fetchMyProfile,
  neighborName,
  unblockUser,
  FREE_CLAIM_LIMIT,
} from "@/lib/db";

import { LanguageToggle } from "@/components/LanguageToggle";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Hey Neighbor" },
      {
        name: "description",
        content: "Manage your Hey Neighbor profile details, contact info and pickup address.",
      },
      { property: "og:title", content: "My Profile — Hey Neighbor" },
      { property: "og:description", content: "Your neighborhood sharing profile." },
      { property: "og:url", content: "/profile" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
  component: ProfileScreen,
});

const schema = z.object({
  first_name: z.string().trim().max(60),
  last_name: z.string().trim().max(60),
  phone: z.string().trim().max(30),
  address_line1: z.string().trim().max(120),
  address_city: z.string().trim().max(80),
  address_postcode: z.string().trim().max(20),
  radius_km: z.coerce.number().min(0.2).max(25),
});

const boxClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-primary";

function ProfileScreen() {
  const t = useT();
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address_line1: "",
    address_city: "",
    address_postcode: "",
    radius_km: "1",
  });

  const data = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: () => fetchMyProfile(userId!),
    enabled: Boolean(userId),
  });

  const claims = useQuery({
    queryKey: ["free-claims", userId],
    queryFn: () => fetchFreeClaimsUsed(userId!),
    enabled: Boolean(userId),
  });

  const isAdmin = useQuery({
    queryKey: ["is-admin", userId],
    queryFn: () => fetchIsAdmin(userId!),
    enabled: Boolean(userId),
  });

  const blocked = useQuery({
    queryKey: ["blocked-users", userId],
    queryFn: () => fetchBlockedUsers(userId!),
    enabled: Boolean(userId),
  });

  async function handleUnblock(blockedId: string) {
    if (!userId) return;
    try {
      await unblockUser(userId, blockedId);
      queryClient.invalidateQueries({ queryKey: ["blocked-users", userId] });
      queryClient.invalidateQueries({ queryKey: ["nearby"] });
      toast.success(t("Neighbor unblocked."));
    } catch {
      toast.error(t("Could not unblock this neighbor."));
    }
  }

  useEffect(() => {
    const p = data.data?.profile;
    const pv = data.data?.priv;
    if (!p && !pv) return;
    setForm({
      first_name: p?.first_name ?? "",
      last_name: p?.last_name ?? "",
      phone: pv?.phone ?? "",
      address_line1: pv?.address_line1 ?? "",
      address_city: pv?.address_city ?? "",
      address_postcode: pv?.address_postcode ?? "",
      radius_km: String(pv?.radius_km ?? 1),
    });
  }, [data.data]);

  const fullName = `${form.first_name} ${form.last_name}`.trim() || t("Your profile");

  async function save() {
    if (!userId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("Check your details"));
      return;
    }
    setBusy(true);
    try {
      const [pub, priv] = await Promise.all([
        supabase
          .from("profiles")
          .update({ first_name: parsed.data.first_name, last_name: parsed.data.last_name })
          .eq("id", userId),
        supabase.from("profile_private").upsert({
          id: userId,
          phone: parsed.data.phone,
          address_line1: parsed.data.address_line1,
          address_city: parsed.data.address_city,
          address_postcode: parsed.data.address_postcode,
          radius_km: parsed.data.radius_km,
        }),
      ]);
      if (pub.error) throw pub.error;
      if (priv.error) throw priv.error;
      toast.success(t("Profile updated."));
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
    } catch (error) {
      console.error(error);
      toast.error(t("Could not save your profile."));
    } finally {
      setBusy(false);
    }
  }

  async function saveLocation() {
    if (!userId || !("geolocation" in navigator)) {
      toast.error(t("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase
          .from("profile_private")
          .upsert({ id: userId, lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (error) toast.error(t("Could not save your location."));
        else {
          toast.success(t("Home location saved for 1 km matching."));
          queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
        }
      },
      () => toast.error(t("Location permission denied.")),
    );
  }

  async function changeAvatar(file: File | null) {
    if (!file || !userId) return;
    setBusy(true);
    try {
      const path = await uploadPhoto(userId, file, "avatars");
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", userId);
      if (error) throw error;
      toast.success(t("Photo updated."));
      queryClient.invalidateQueries({ queryKey: ["my-profile", userId] });
    } catch (error) {
      if (error instanceof ExplicitImageError) toast.error(t(error.message));
      else toast.error(t("Could not upload that photo."));
    } finally {

      setBusy(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const rows = [
    { icon: User, label: t("First Name"), value: form.first_name || "—" },
    { icon: User, label: t("Last Name"), value: form.last_name || "—" },
    { icon: Mail, label: t("Email"), value: data.data?.priv?.email ?? "—" },
    { icon: Phone, label: t("Phone Number"), value: form.phone || "—" },
  ];

  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-primary">
        <StatusBar tone="light" />
        <div className="flex justify-center pt-2 pb-1">
          <Logo size="sm" tone="light" />
        </div>
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-1 pt-1">
          <span />
          <h1 className="text-center text-lg font-bold text-primary-foreground">
            {t("My Profile")}
          </h1>
          <button
            aria-label={t("Edit profile")}
            onClick={() => setEditing((v) => !v)}
            className="flex justify-end text-primary-foreground"
          >
            <Settings className="size-6" />
          </button>
        </div>

        <div className="flex justify-center pb-14 pt-4">
          <div className="relative">
            <Avatar
              path={data.data?.profile?.avatar_url}
              alt={fullName}
              className="size-36 rounded-full border-4 border-primary-foreground object-cover text-3xl"
            />
            <label className="absolute bottom-1 right-1 flex size-10 cursor-pointer items-center justify-center rounded-full border-[3px] border-primary bg-primary-deep">
              <Camera className="size-5 text-primary-foreground" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => changeAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="-mt-8 flex-1 rounded-t-[2rem] bg-card px-6 pb-28 pt-3">
          {data.isPending && (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("Loading profile…")}
            </p>
          )}

          {editing ? (
            <div className="space-y-3 pt-2">
              {(
                [
                  ["first_name", "First name"],
                  ["last_name", "Last name"],
                  ["phone", "Phone number"],
                  ["address_line1", "Address"],
                  ["address_city", "City"],
                  ["address_postcode", "Postcode"],
                  ["radius_km", "Match radius (km)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[12px] font-bold">{t(label)}</span>
                  <input
                    className={boxClass}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <Button
                onClick={save}
                disabled={busy}
                size="lg"
                className="h-12 w-full rounded-xl text-[14px] font-bold"
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />} {t("Save changes")}
              </Button>
            </div>
          ) : (
            <>
              {rows.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-border py-4"
                >
                  <span className="flex items-center gap-3 text-sm font-bold">
                    <Icon className="size-5 text-primary" strokeWidth={2.2} />
                    {label}
                  </span>
                  <span className="truncate text-sm text-muted-foreground">{value}</span>
                </div>
              ))}
              <div className="flex items-start justify-between gap-4 border-b border-border py-4">
                <span className="flex items-center gap-3 text-sm font-bold">
                  <MapPin className="size-5 text-primary" strokeWidth={2.2} />
                  {t("Address")}
                </span>
                <span className="text-right text-sm leading-relaxed text-muted-foreground">
                  {[form.address_line1, form.address_city, form.address_postcode]
                    .filter(Boolean)
                    .map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  {!form.address_line1 && !form.address_city && <span>{t("Not set")}</span>}
                </span>
              </div>

              <div className="rounded-2xl bg-primary-soft p-4 mt-4">
                <p className="text-[13px] font-semibold text-primary-deep">
                  {claims.data ?? 0} {t("of")} {FREE_CLAIM_LIMIT}{" "}
                  {t(
                    "free claims used this month. Free claims reset on the 1st; extra claims cost €1.00 each.",
                  )}
                </p>
                <p className="mt-1 text-[12px] text-primary-deep/80">
                  {t("Matching radius")}: {form.radius_km} km ·{" "}
                  {data.data?.priv?.lat != null
                    ? t("Home location saved")
                    : t("No home location yet")}
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-card p-4">
                <p className="flex items-center gap-2 text-[13px] font-bold">
                  <UserX className="size-4 text-primary" strokeWidth={2.4} />{" "}
                  {t("Blocked neighbors")}
                </p>
                {blocked.isPending ? (
                  <p className="mt-2 text-[12px] text-muted-foreground">{t("Loading…")}</p>
                ) : (blocked.data ?? []).length === 0 ? (
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {t("You haven't blocked anyone.")}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {(blocked.data ?? []).map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-[13px] font-semibold">
                          <Avatar
                            path={row.person?.avatar_url}
                            alt={neighborName(row.person?.first_name, row.person?.last_name)}
                            className="size-8 rounded-full object-cover"
                          />
                          {neighborName(row.person?.first_name, row.person?.last_name)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnblock(row.blocked_id)}
                          className="rounded-lg text-[12px] font-bold"
                        >
                          {t("Unblock")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <Button
                  variant="outline"
                  onClick={saveLocation}
                  className="h-12 w-full rounded-xl border-border text-[14px] font-bold"
                >
                  <MapPin className="mr-2 size-4" /> {t("Use my current location")}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 w-full rounded-xl border-border text-[14px] font-bold"
                >
                  <Link to="/settings">
                    <Settings className="mr-2 size-4" /> {t("Settings & recovery")}
                  </Link>
                </Button>

                {isAdmin.data && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 w-full rounded-xl border-border text-[14px] font-bold"
                  >
                    <Link to="/admin">
                      <ShieldCheck className="mr-2 size-4" /> {t("Admin dashboard")}
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={signOut}
                  className="h-12 w-full rounded-xl border-border text-[14px] font-bold text-destructive"
                >
                  <LogOut className="mr-2 size-4" /> {t("Sign out")}
                </Button>
                <div className="flex items-center justify-between gap-4 border-b border-border py-4">
                  <span className="flex items-center gap-3 text-sm font-bold">
                    <Languages className="size-5 text-primary" strokeWidth={2.2} />
                    {t("Language")}
                  </span>
                  <LanguageToggle />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mt-auto px-4 py-3 text-center text-[11px] text-primary-foreground/70">
          © 2026 Hey Neighbor
        </div>
      </div>
      <BottomNav />
    </>
  );
}
