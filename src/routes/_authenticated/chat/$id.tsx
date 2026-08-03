import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Send, ShieldCheck, CheckCheck, Loader2, Lock, UserX } from "lucide-react";
import { toast } from "sonner";
import { PhoneShell } from "@/components/PhoneShell";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, ListingPhoto } from "@/components/ListingPhoto";
import { useUserId } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto, ExplicitImageError } from "@/lib/photos";
import {
  FREE_CLAIM_LIMIT,
  blockUser,
  fetchChatLock,
  fetchConversation,
  fetchIsUserBlocked,
  fetchMessages,
  neighborName,
  sendMessage,
} from "@/lib/db";
import {
  LANGUAGE_BLOCKED_MESSAGE,
  containsBannedWords,
  moderationErrorMessage,
} from "@/lib/moderation";
import { useT } from "@/lib/i18n";



export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({
    meta: [
      { title: "Chat with a neighbor — Hey Neighbor" },
      {
        name: "description",
        content: "Coordinate a pickup time with your neighbor in a safe, simple in-app chat.",
      },
      { property: "og:title", content: "Chat with a neighbor — Hey Neighbor" },
      { property: "og:description", content: "Arrange the handover in a few messages." },
    ],
  }),
  component: ChatThread,
});

function ChatThread() {
  const t = useT();
  const { id } = Route.useParams();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const conversation = useQuery({
    queryKey: ["conversation", id, userId],
    queryFn: () => fetchConversation(id, userId!),
    enabled: Boolean(userId),
  });

  const chatLock = useQuery({
    queryKey: ["chat-lock", id, userId],
    queryFn: () =>
      fetchChatLock(conversation.data!.listing_id, conversation.data!.owner_id, userId!),
    enabled: Boolean(userId && conversation.data),
  });

  const messages = useQuery({
    queryKey: ["messages", id],
    queryFn: () => fetchMessages(id),
  });

  const otherId = conversation.data
    ? conversation.data.owner_id === userId
      ? conversation.data.receiver_id
      : conversation.data.owner_id
    : null;

  const blockState = useQuery({
    queryKey: ["block-state", userId, otherId],
    queryFn: () => fetchIsUserBlocked(userId!, otherId!),
    enabled: Boolean(userId && otherId),
  });

  const isBlocked = Boolean(blockState.data?.blockedByMe || blockState.data?.blockedMe);

  async function handleBlock() {
    if (!userId || !otherId) return;
    try {
      await blockUser(userId, otherId);
      queryClient.invalidateQueries({ queryKey: ["block-state", userId, otherId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users", userId] });
      queryClient.invalidateQueries({ queryKey: ["nearby"] });
      toast.success(t("Neighbor blocked. You won't see each other in the app."));
      navigate({ to: "/chat" });
    } catch {
      toast.error(t("Could not block this neighbor."));
    }
  }



  useEffect(() => {
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const name = neighborName(conversation.data?.person?.first_name, conversation.data?.person?.last_name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !userId || body.length > 1000 || chatLock.data?.locked || isBlocked) return;
    if (containsBannedWords(body)) {
      toast.error(t(LANGUAGE_BLOCKED_MESSAGE));
      return;
    }
    setBusy(true);
    try {
      await sendMessage(id, userId, body);
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    } catch (error) {
      const moderation = moderationErrorMessage(error);
      toast.error(moderation ? t(moderation) : t("Message not sent. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function sendPhoto(file: File | null) {
    if (!file || !userId || chatLock.data?.locked || isBlocked) return;
    setBusy(true);
    try {
      const path = await uploadPhoto(userId, file, "chat");
      await sendMessage(id, userId, "📷 Photo", path);
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    } catch (error) {
      if (error instanceof ExplicitImageError) toast.error(t(error.message));
      else {
        const moderation = moderationErrorMessage(error);
        toast.error(moderation ? t(moderation) : t("Could not send that photo."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneShell>
      <TopBar
        title={conversation.isPending ? t("Chat") : `${t("Chat with")} ${name}`}
        backTo="/chat"
        right={
          otherId && !blockState.data?.blockedByMe ? (
            <AlertDialog>
              <AlertDialogTrigger aria-label={t("Block neighbor")} className="flex justify-end">
                <UserX className="size-5 text-muted-foreground" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Block this neighbor?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "They won't be able to message you and you won't see each other's items. You can unblock them later from your profile.",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBlock}>{t("Block")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null
        }
      />

      {conversation.data?.listing && (
        <button
          type="button"
          onClick={() =>
            navigate({ to: "/item/$id", params: { id: conversation.data!.listing!.id } })
          }
          className="mx-4 mb-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-card"
        >
          <ListingPhoto
            path={conversation.data.listing.photo_url}
            alt={conversation.data.listing.title}
            className="size-14 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold">{conversation.data.listing.title}</p>
            <p className="truncate text-[12px] font-semibold text-muted-foreground">
              {t(conversation.data.listing.category ?? "")}
              {conversation.data.listing.condition
                ? ` · ${t(conversation.data.listing.condition)}`
                : ""}
            </p>
          </div>
          <span className="shrink-0 text-[12px] font-bold text-primary">{t("View item")}</span>
        </button>
      )}

      <div className="flex-1 space-y-3 px-4">

        <div className="flex items-start gap-2 rounded-2xl bg-primary-soft p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.4} />
          <p className="text-[12px] font-semibold leading-snug text-primary-deep">
            {t("Be kind, be safe.")}
            <br />
            {t("Never share personal or payment information.")}
          </p>
        </div>

        {messages.isPending && (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("Loading messages…")}
          </p>
        )}

        {(messages.data ?? []).map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <Avatar
                  path={conversation.data?.person?.avatar_url}
                  alt={name}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              )}
              <div
                className={`max-w-[74%] rounded-2xl px-3.5 py-2.5 ${
                  mine
                    ? "rounded-br-md bg-bubble-me text-bubble-me-foreground"
                    : "rounded-bl-md bg-bubble-them text-bubble-them-foreground"
                }`}
              >
                {m.image_url && (
                  <ListingPhoto
                    path={m.image_url}
                    alt="Shared photo"
                    className="mb-2 h-40 w-48 rounded-xl object-cover"
                  />
                )}
                <p className="text-[13px] leading-snug">{m.body}</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {mine && <CheckCheck className="size-3 text-primary" />}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isBlocked ? (
        <div className="sticky bottom-0 mt-4 bg-background px-4 py-3">
          <div className="rounded-2xl bg-secondary p-4 text-center">
            <UserX className="mx-auto size-5 text-primary" />
            <p className="mt-2 text-[13px] font-semibold leading-snug text-primary-deep">
              {blockState.data?.blockedByMe
                ? t("You blocked this neighbor. Unblock them from your profile to chat again.")
                : t("This conversation is closed because this neighbor blocked you.")}
            </p>
          </div>
        </div>
      ) : chatLock.data?.locked ? (

        <div className="sticky bottom-0 mt-4 bg-background px-4 py-3">
          <div className="rounded-2xl bg-primary-soft p-4 text-center">
            <Lock className="mx-auto size-5 text-primary" />
            <p className="mt-2 text-[13px] font-semibold leading-snug text-primary-deep">
              {t(
                "Your {limit} free items this month are used. Pay €1.00 for this item to chat with your neighbor — browsing stays free.",
              ).replace("{limit}", String(FREE_CLAIM_LIMIT))}
            </p>
            {chatLock.data.claimId ? (
              <Button
                size="lg"
                onClick={() =>
                  navigate({ to: "/pay/$claimId", params: { claimId: chatLock.data!.claimId! } })
                }
                className="mt-3 h-12 w-full rounded-xl text-[15px] font-bold"
              >
                {t("Pay €1.00")}
              </Button>
            ) : (
              conversation.data?.listing_id && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    navigate({ to: "/item/$id", params: { id: conversation.data!.listing_id! } })
                  }
                  className="mt-3 h-12 w-full rounded-xl border-primary/40 text-[15px] font-bold text-primary"
                >
                  {t("View item")}
                </Button>
              )
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="sticky bottom-0 mt-4 flex items-center gap-2 bg-background px-4 py-3">
          <label
            aria-label={t("Send a photo")}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary"
          >
            <Camera className="size-5 text-primary-foreground" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => sendPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <input
            value={draft}
            maxLength={1000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("Type a message...")}
            className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            aria-label={t("Send message")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary"
          >
            <Send className="size-4 text-primary-foreground" />
          </button>
        </form>
      )}

    </PhoneShell>
  );
}
