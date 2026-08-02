import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { moderateImage } from "@/utils/moderation.functions";
import { IMAGE_BLOCKED_MESSAGE } from "@/lib/moderation";

const cache = new Map<string, string>();

function toDataUrl(file: File) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** Downscales an image so the safety check stays fast and small. */
async function toSmallDataUrl(file: File) {
  const original = await toDataUrl(file);
  if (!original) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return original;
  }
}

export class ExplicitImageError extends Error {
  constructor() {
    super(IMAGE_BLOCKED_MESSAGE);
    this.name = "ExplicitImageError";
  }
}

export async function uploadPhoto(userId: string, file: File, folder: string) {
  const dataUrl = await toSmallDataUrl(file);
  if (dataUrl) {
    const verdict = await moderateImage({ data: { dataUrl } });
    if (!verdict.allowed) throw new ExplicitImageError();
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getPhotoUrl(path: string) {
  const cached = cache.get(path);
  if (cached) return cached;
  const { data } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
  if (data?.signedUrl) cache.set(path, data.signedUrl);
  return data?.signedUrl ?? null;
}

/** Resolves a stored photo path to a temporary viewable URL. */
export function usePhotoUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(path ? (cache.get(path) ?? null) : null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let active = true;
    getPhotoUrl(path).then((next) => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}
