import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Alerts an item owner the moment a neighbor requests one of their items.
 * Uses a system notification when the neighbor has granted permission,
 * and always falls back to an in-app toast.
 */
export function useRequestNotifications(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  const asked = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (!asked.current && typeof Notification !== "undefined" && Notification.permission === "default") {
      asked.current = true;
      void Notification.requestPermission().catch(() => undefined);
    }

    const channel = supabase
      .channel(`requests-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "claims", filter: `owner_id=eq.${userId}` },
        (payload) => {
          const listingId = (payload.new as { listing_id?: string }).listing_id;
          const body = "A neighbor just requested one of your items.";
          toast.success("New item request", { description: body });
          queryClient.invalidateQueries({ queryKey: ["my-listings", userId] });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification("Hey Neighbor", { body, tag: `claim-${listingId ?? "item"}` });
            } catch {
              /* notifications unsupported in this context */
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
