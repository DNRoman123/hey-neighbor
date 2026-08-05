CREATE OR REPLACE FUNCTION public.can_message_in_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (
        -- the giver (item owner) is never restricted
        c.owner_id = _user_id
        OR (
          c.receiver_id = _user_id
          AND EXISTS (
            SELECT 1 FROM public.claims cl
            WHERE cl.listing_id = c.listing_id
              AND cl.receiver_id = _user_id
              AND cl.receiver_accepted_at IS NOT NULL
              AND cl.status <> 'pending_payment'
          )
        )
      )
  )
$$;

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

CREATE POLICY "Participants can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_participant(conversation_id, auth.uid())
  AND public.can_message_in_conversation(conversation_id, auth.uid())
);