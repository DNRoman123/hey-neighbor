import { supabase } from "@/integrations/supabase/client";

export const FREE_CLAIM_LIMIT = 2;
export const EXTRA_CLAIM_FEE_CENTS = 100;

/** Categories neighbors can share on Hey Neighbor. */
export const LISTING_CATEGORIES = [
  "Unopened Food",
  "Clothing",
  "Furniture",
  "Item",
] as const;

export const FOOD_CONDITIONS = ["New", "Used"] as const;

export const FOOD_DISCLAIMER = "No homemade or opened food may be shared.";

export type NearbyListing = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  condition: string;
  category: string;
  expires_on: string | null;
  best_before: string | null;
  photo_url: string | null;
  area_label: string | null;
  status: string;
  created_at: string;
  distance_km: number | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_avatar_url: string | null;
};

export function neighborName(first?: string | null, last?: string | null) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (!f && !l) return "A neighbor";
  return `${f}${l ? ` ${l[0]}.` : ""}`.trim();
}

export function formatDistance(km: number | null) {
  if (km == null) return "Nearby";
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function formatBestBefore(date: string | null) {
  if (!date) return "No best before date";
  return `Best before ${new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

/** @deprecated use formatBestBefore */
export const formatExpiry = formatBestBefore;

export async function fetchNearby(lat: number | null, lng: number | null, radiusKm: number) {
  const { data, error } = await supabase.rpc("nearby_listings", {
    _lat: lat as number,
    _lng: lng as number,
    _radius_km: radiusKm,
  });
  if (error) throw error;
  return (data ?? []) as NearbyListing[];
}

export async function fetchMyProfile(userId: string) {
  const [pub, priv] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("profile_private").select("*").eq("id", userId).maybeSingle(),
  ]);
  if (pub.error) throw pub.error;
  if (priv.error) throw priv.error;
  return { profile: pub.data, priv: priv.data };
}

export async function fetchMyListings(userId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("id, title, condition, category, best_before, photo_url, status, created_at")
    .eq("owner_id", userId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Owner-side delete. Tries a permanent delete first; if the item is tied to
 * claims or chats it stays in the database but is marked removed so it
 * disappears from the app for everyone.
 */
export async function deleteMyListing(id: string) {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (!error) return "deleted" as const;
  const { error: softError } = await supabase
    .from("listings")
    .update({ status: "removed" })
    .eq("id", id);
  if (softError) throw softError;
  return "removed" as const;
}



export async function fetchListing(id: string) {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, owner_id, title, description, condition, category, best_before, photo_url, area_label, status",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: owner } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url, area_label")
    .eq("id", data.owner_id)
    .maybeSingle();
  return { ...data, owner };
}

export async function fetchFreeClaimsUsed(userId: string) {
  const { data, error } = await supabase.rpc("free_claims_used", { _user_id: userId });
  if (error) throw error;
  return (data as number) ?? 0;
}

export type ClaimSummary = {
  id: string;
  status: string;
  fee_cents: number;
  is_free: boolean;
  receiver_accepted_at: string | null;
  owner_accepted_at: string | null;
};

const CLAIM_FIELDS = "id, status, fee_cents, is_free, receiver_accepted_at, owner_accepted_at";

/** The current user's claim on a listing, if they already accepted it. */
export async function fetchMyClaim(listingId: string, receiverId: string) {
  const { data, error } = await supabase
    .from("claims")
    .select(CLAIM_FIELDS)
    .eq("listing_id", listingId)
    .eq("receiver_id", receiverId)
    .maybeSingle();
  if (error) throw error;
  return (data as ClaimSummary | null) ?? null;
}

/**
 * Step 1 of the two-sided agreement: the receiver ticks the acceptance box.
 * Nothing counts toward the 2 free items this month and nothing is charged until the
 * owner also agrees (see `ownerAcceptClaim`).
 */
export async function acceptItemAsReceiver(
  listingId: string,
  ownerId: string,
  receiverId: string,
): Promise<ClaimSummary> {
  const existing = await fetchMyClaim(listingId, receiverId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("claims")
    .insert({
      listing_id: listingId,
      owner_id: ownerId,
      receiver_id: receiverId,
      is_free: true,
      fee_cents: 0,
      status: "awaiting_owner",
      receiver_accepted_at: new Date().toISOString(),
    })
    .select(CLAIM_FIELDS)
    .single();
  if (error) throw error;
  return data as ClaimSummary;
}

/**
 * Step 2: the owner agrees. Only now does the claim count toward the
 * receiver's 2 free items for the current month — or become a €1 paid claim.
 */
export async function ownerAcceptClaim(claimId: string) {
  const { data, error } = await supabase.rpc("owner_accept_claim" as never, {
    _claim_id: claimId,
  } as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { id: string; status: string; fee_cents: number; is_free: boolean }
    | undefined;
  if (!row) throw new Error("Could not confirm the request.");
  return row;
}

/** Requests waiting for the owner (me) to agree. */
export async function fetchIncomingRequests(ownerId: string) {
  const { data, error } = await supabase
    .from("claims")
    .select("id, status, fee_cents, listing_id, receiver_id, created_at")
    .eq("owner_id", ownerId)
    .in("status", ["awaiting_owner", "pending_payment"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const claims = data ?? [];
  if (claims.length === 0) return [];

  const [listings, profiles] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, photo_url, category")
      .in("id", claims.map((c) => c.listing_id)),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .in("id", claims.map((c) => c.receiver_id)),
  ]);

  return claims.map((claim) => ({
    ...claim,
    listing: (listings.data ?? []).find((l) => l.id === claim.listing_id) ?? null,
    receiver: (profiles.data ?? []).find((p) => p.id === claim.receiver_id) ?? null,
  }));
}


export async function payForClaim(claimId: string, userId: string) {
  const { error: payError } = await supabase.from("payments").insert({
    user_id: userId,
    claim_id: claimId,
    amount_cents: EXTRA_CLAIM_FEE_CENTS,
    status: "succeeded",
    provider: "demo",
  });
  if (payError) throw payError;
  const { error } = await supabase.from("claims").update({ status: "confirmed" }).eq("id", claimId);
  if (error) throw error;
}

export async function openConversation(listingId: string, ownerId: string, receiverId: string) {
  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("owner_id", ownerId)
    .eq("receiver_id", receiverId)
    .maybeSingle();
  if (existing.data) return existing.data.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, owner_id: ownerId, receiver_id: receiverId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, listing_id, owner_id, receiver_id, last_message_at")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  const blocked = await fetchBlockedIds(userId);
  const rows = (data ?? []).filter(
    (r) => !blocked.has(r.owner_id === userId ? r.receiver_id : r.owner_id),
  );
  const otherIds = [...new Set(rows.map((r) => (r.owner_id === userId ? r.receiver_id : r.owner_id)))];

  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))] as string[];

  const [people, items, lastMessages] = await Promise.all([
    otherIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", otherIds)
      : Promise.resolve({ data: [] as never[] }),
    listingIds.length
      ? supabase.from("listings").select("id, title, photo_url").in("id", listingIds)
      : Promise.resolve({ data: [] as never[] }),
    rows.length
      ? supabase
          .from("messages")
          .select("conversation_id, body, created_at")
          .in(
            "conversation_id",
            rows.map((r) => r.id),
          )
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  return rows.map((row) => {
    const otherId = row.owner_id === userId ? row.receiver_id : row.owner_id;
    const person = (people.data ?? []).find((p) => p.id === otherId);
    const listing = (items.data ?? []).find((l) => l.id === row.listing_id);
    const last = (lastMessages.data ?? []).find((m) => m.conversation_id === row.id);
    return { ...row, person, listing, last };
  });
}

export async function fetchConversation(conversationId: string, userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, listing_id, owner_id, receiver_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const otherId = data.owner_id === userId ? data.receiver_id : data.owner_id;
  const { data: person } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", otherId)
    .maybeSingle();
  return { ...data, person };
}

export type ChatLock = { locked: boolean; claimId: string | null };

/**
 * Receivers get 2 free items a month. Once those are used up they can still
 * browse items, but chatting with a giver stays locked until the €1 fee for
 * that claim is paid. Givers are never locked.
 */
export async function fetchChatLock(
  listingId: string | null,
  ownerId: string,
  userId: string,
): Promise<ChatLock> {
  if (ownerId === userId) return { locked: false, claimId: null };

  const used = await fetchFreeClaimsUsed(userId);
  if (used < FREE_CLAIM_LIMIT) return { locked: false, claimId: null };

  if (!listingId) return { locked: true, claimId: null };
  const claim = await fetchMyClaim(listingId, userId);
  if (claim && (claim.status === "confirmed" || claim.status === "completed")) {
    return { locked: false, claimId: claim.id };
  }
  return { locked: true, claimId: claim?.id ?? null };
}


export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, image_url, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId: string, senderId: string, body: string, imageUrl?: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body, image_url: imageUrl ?? null });
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function reportContent(
  reporterId: string,
  reason: string,
  target: { listingId?: string; messageId?: string },
) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    reason,
    listing_id: target.listingId ?? null,
    message_id: target.messageId ?? null,
  });
  if (error) throw error;
}

export async function fetchIsAdmin(userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) return false;
  return Boolean(data);
}

/* ------------------------------- Blocking -------------------------------- */

/** Everyone this user has blocked, plus their public profile. */
export async function fetchBlockedUsers(userId: string) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: people } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", rows.map((r) => r.blocked_id));
  return rows.map((row) => ({
    ...row,
    person: (people ?? []).find((p) => p.id === row.blocked_id) ?? null,
  }));
}

/** Ids blocked by me or who blocked me — used to hide people from lists. */
export async function fetchBlockedIds(userId: string) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) throw error;
  return new Set(
    (data ?? []).map((row) => (row.blocker_id === userId ? row.blocked_id : row.blocker_id)),
  );
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocked_users")
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function fetchIsUserBlocked(userId: string, otherId: string) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`,
    );
  if (error) throw error;
  const rows = data ?? [];
  return {
    blockedByMe: rows.some((r) => r.blocker_id === userId),
    blockedMe: rows.some((r) => r.blocker_id === otherId),
  };
}

