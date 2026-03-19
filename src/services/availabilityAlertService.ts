import { supabase } from "@/integrations/supabase/client";

export interface NewAvailabilitySlotPayload {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string | null;
}

export const notifyAvailabilityAlertMatches = async (
  mentorId: string,
  slots: NewAvailabilitySlotPayload[]
) => {
  if (!mentorId || !slots.length) return;

  try {
    const { error } = await supabase.functions.invoke(
      "notify-availability-alerts",
      {
        body: {
          mentorId,
          slots,
        },
      }
    );

    if (error) {
      console.warn("Failed to trigger availability alert emails:", error);
    }
  } catch (error) {
    console.warn("Unexpected error triggering availability alert emails:", error);
  }
};
