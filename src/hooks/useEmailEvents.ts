import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EventType = "draft_created" | "draft_refined" | "sent_gmail" | "sent_outlook" | "draft_deleted";

export const useEmailEvents = () => {
  const { user } = useAuth();

  const trackEvent = useCallback(
    async (eventType: EventType, draftId?: string, metadata?: Record<string, unknown>) => {
      if (!user) return;
      await supabase.from("email_events").insert([{
        user_id: user.id,
        event_type: eventType,
        draft_id: draftId || null,
        metadata: (metadata || {}) as any,
      }]);
    },
    [user]
  );

  return { trackEvent };
};
