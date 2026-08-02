import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { X, ImagePlus, ChevronDown, Calendar, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ListingPhoto } from "@/components/ListingPhoto";
import { useUserId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto, ExplicitImageError } from "@/lib/photos";
import { LISTING_CATEGORIES, FOOD_CONDITIONS, FOOD_DISCLAIMER, fetchMyProfile } from "@/lib/db";
import {
  LANGUAGE_BLOCKED_MESSAGE,
  firstBannedField,
  moderationErrorMessage,
} from "@/lib/moderation";
import { useT } from "@/lib/i18n";


const schema = z
  .object({
    title: z.string().trim().min(3, "Give your item a name").max(100),
    description: z.string().trim().max(300, "Keep the description under 300 characters"),
    condition: z.string().min(1),
    category: z.enum(LISTING_CATEGORIES),
    best_before: z.string().optional(),
    area_label: z.string().trim().max(80).optional(),
    confirmed: z.boolean().optional(),
  })
  .refine((data) => data.category !== "Unopened Food" || data.best_before?.trim(), {
    message: "A best before date is required for food items",
    path: ["best_before"],
  })
  .refine((data) => data.category !== "Unopened Food" || data.confirmed, {
    message: "Please confirm the food is unopened and shop-packaged",
    path: ["confirmed"],
  });

const boxClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-3 text-[13px] outline-none focus:border-primary";

function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-bold">
        {label} {hint && <span className="font-semibold text-muted-foreground">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

export type EditableListing = {
  id: string;
  title: string;
  description: string | null;
  condition: string;
  category: string;
  best_before: string | null;
  photo_url: string | null;
  area_label: string | null;
};

export function ListingForm({ listing }: { listing?: EditableListing }) {
  const t = useT();
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(listing);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(listing?.photo_url ?? null);
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [condition, setCondition] = useState<string>(listing?.condition ?? FOOD_CONDITIONS[0]);
  const [category, setCategory] = useState<string>(listing?.category ?? LISTING_CATEGORIES[0]);
  const [bestBefore, setBestBefore] = useState(listing?.best_before ?? "");
  const [area, setArea] = useState(listing?.area_label ?? "");
  const [useGps, setUseGps] = useState(!isEdit);
  const [confirmed, setConfirmed] = useState(isEdit && listing?.category === "Unopened Food");
  const [busy, setBusy] = useState(false);

  const isFood = category === "Unopened Food";

  const profile = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: () => fetchMyProfile(userId!),
    enabled: Boolean(userId),
  });

  function pickFile(next: File | null) {
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    if (next) setExistingPhoto(null);
  }

  async function resolveCoords(): Promise<{ lat: number | null; lng: number | null }> {
    const saved = { lat: profile.data?.priv?.lat ?? null, lng: profile.data?.priv?.lng ?? null };
    if (!useGps || !("geolocation" in navigator)) return saved;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(saved),
        { timeout: 8000 },
      );
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parsed = schema.safeParse({
      title,
      description,
      condition,
      category,
      best_before: bestBefore,
      area_label: area,
      confirmed,
    });
    if (!parsed.success) {
      toast.error(t(parsed.error.issues[0]?.message ?? "Check your details"));
      return;
    }
    if (
      firstBannedField({
        title: parsed.data.title,
        description: parsed.data.description,
        area: parsed.data.area_label ?? "",
      })
    ) {
      toast.error(t(LANGUAGE_BLOCKED_MESSAGE));
      return;
    }
    setBusy(true);

    try {
      let photoPath: string | null = existingPhoto;
      if (file) photoPath = await uploadPhoto(userId, file, "listings");

      const values = {
        title: parsed.data.title,
        description: parsed.data.description,
        condition: parsed.data.condition,
        category: parsed.data.category,
        best_before: isFood ? parsed.data.best_before ?? null : null,
        expires_on: isFood ? parsed.data.best_before ?? null : null,
        photo_url: photoPath,
        area_label: parsed.data.area_label || (profile.data?.profile?.area_label ?? null),
      };

      if (listing) {
        const { error } = await supabase.from("listings").update(values).eq("id", listing.id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["my-listings", userId] });
        queryClient.invalidateQueries({ queryKey: ["listing", listing.id] });
        toast.success(t("Your changes are saved."));
      } else {
        const coords = await resolveCoords();
        const { error } = await supabase
          .from("listings")
          .insert({ owner_id: userId, ...values, lat: coords.lat, lng: coords.lng });
        if (error) throw error;
        toast.success(t("Your item is live for neighbors nearby."));
      }
      navigate({ to: "/listings" });
    } catch (error) {
      console.error(error);
      if (error instanceof ExplicitImageError) {
        toast.error(t(error.message));
      } else {
        const moderation = moderationErrorMessage(error);
        toast.error(
          moderation
            ? t(moderation)
            : isEdit
              ? t("Could not save those changes. Please try again.")
              : t("Could not publish that item. Please try again."),
        );
      }
    } finally {

      setBusy(false);
    }
  }

  return (
    <form className="space-y-4 px-4" onSubmit={submit}>
      <div className="flex items-start gap-2 rounded-2xl bg-primary-soft p-4">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.4} />
        <p className="text-[13px] font-semibold leading-snug text-primary-deep">
          {isFood
            ? `${t(FOOD_DISCLAIMER)} ${t("Only unopened packaged food may be listed.")}`
            : t("Make sure items are clean, usable and safe to pass on.")}
        </p>
      </div>

      <div>
        <p className="mb-2 text-[12px] font-bold">{t("Photo")}</p>
        {preview || existingPhoto ? (
          <div className="relative">
            {preview ? (
              <img src={preview} alt={t("Item preview")} className="h-40 w-full rounded-xl object-cover" />
            ) : (
              <ListingPhoto
                path={existingPhoto}
                alt={t("Item preview")}
                className="h-40 w-full rounded-xl object-cover"
              />
            )}
            <button
              type="button"
              aria-label={t("Remove photo")}
              onClick={() => {
                setExistingPhoto(null);
                pickFile(null);
              }}
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card shadow-card"
            >
              <X className="size-3.5" strokeWidth={3} />
            </button>
          </div>
        ) : (
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-card py-8 text-[13px] font-bold text-primary">
            <ImagePlus className="size-4" /> {t("Add a photo")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      <Labeled label={t("What is it?")}>
        <input
          className={boxClass}
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("e.g. Unopened pasta, small jacket, desk chair")}
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{title.length}/100</p>
      </Labeled>

      <Labeled label={t("Category")}>
        <div className="relative">
          <select
            className={`${boxClass} appearance-none pr-10`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {LISTING_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(c)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </Labeled>

      <Labeled label={t("Description")}>
        <textarea
          rows={3}
          className={`${boxClass} resize-none`}
          value={description}
          maxLength={300}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Size, brand, condition, or why you're passing it on.")}
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">{description.length}/300</p>
      </Labeled>

      <Labeled label={t("Condition")}>
        <div className="relative">
          <select
            className={`${boxClass} appearance-none pr-10`}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            {FOOD_CONDITIONS.map((c) => (
              <option key={c}>{t(c)}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </Labeled>

      {isFood && (
        <Labeled label={t("Best Before")} hint={t("(required for food)")}>
          <div className="relative">
            <input
              type="date"
              className={`${boxClass} pr-10`}
              value={bestBefore}
              onChange={(e) => setBestBefore(e.target.value)}
            />
            <Calendar className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Labeled>
      )}

      <Labeled label={t("Pickup area")} hint={t("(shown to neighbors)")}>
        <input
          className={boxClass}
          value={area}
          maxLength={80}
          onChange={(e) => setArea(e.target.value)}
          placeholder={t("Oak Street, Dublin 2")}
        />
      </Labeled>

      {isFood && (
        <label className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span className="text-[13px] font-semibold leading-snug text-primary-deep">
            {t("I confirm this is unopened, shop-packaged food — nothing homemade, cooked or opened.")}
          </span>
        </label>
      )}

      {!isEdit && (
        <label className="flex items-start gap-3 rounded-2xl bg-primary-soft p-4">
          <input
            type="checkbox"
            checked={useGps}
            onChange={(e) => setUseGps(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span className="text-[13px] font-semibold leading-snug text-primary-deep">
            <MapPin className="mr-1 inline size-3.5" />
            {t("Use my current location for 1 km matching. Your exact coordinates are never shown to neighbors — only the distance.")}
          </span>
        </label>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={busy}
        className="h-13 w-full rounded-xl text-[15px] font-bold"
      >
        {busy && <Loader2 className="mr-2 size-4 animate-spin" />}{" "}
        {isEdit ? t("Save changes") : t("Publish item")}
      </Button>
    </form>
  );
}
