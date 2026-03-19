import { supabase } from "@/integrations/supabase/client";
import { MAX_NOTIFICATIONS } from "@/config/constants";

export type NotificationType =
  | "booking"
  | "booking_request"
  | "priority_dm"
  | "system";

export type NotificationRouteView =
  | "sessions"
  | "requests"
  | "messages"
  | "reviews"
  | "time-request"
  | "overview"
  | "profile";

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  sourceTable: string | null;
  sourceId: string | null;
  routeView: NotificationRouteView | null;
  routeParams: Record<string, any>;
  metadata: Record<string, any>;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
}

export interface NotificationPreferences {
  user_id: string;
  in_app_enabled: boolean;
  booking_lifecycle_enabled: boolean;
  time_requests_enabled: boolean;
  priority_dm_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  source_table: string | null;
  source_id: string | null;
  route_view: NotificationRouteView | null;
  route_params: Record<string, any> | null;
  metadata: Record<string, any> | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

const BASE_SELECT =
  "id, recipient_id, actor_id, type, title, body, source_table, source_id, route_view, route_params, metadata, read_at, archived_at, created_at, updated_at";

const mapRowToNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  recipientId: row.recipient_id,
  actorId: row.actor_id,
  type: row.type,
  title: row.title,
  body: row.body,
  sourceTable: row.source_table,
  sourceId: row.source_id,
  routeView: row.route_view,
  routeParams: row.route_params || {},
  metadata: row.metadata || {},
  readAt: row.read_at,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isRead: Boolean(row.read_at),
});

export async function listNotifications(
  recipientId: string,
  options?: { limit?: number; includeArchived?: boolean }
): Promise<{ success: boolean; data: AppNotification[]; error?: string }> {
  try {
    let query = supabase
      .from("notifications")
      .select(BASE_SELECT)
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? MAX_NOTIFICATIONS * 2);

    if (!options?.includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    const mapped = (data || []).map((row) =>
      mapRowToNotification(row as NotificationRow)
    );

    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, data: [], error: error?.message || "Failed to load notifications" };
  }
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to mark notification as read" };
  }
}

export async function markAllNotificationsAsRead(
  recipientId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", recipientId)
      .is("read_at", null)
      .is("archived_at", null);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to mark all notifications as read" };
  }
}

export function subscribeToNotifications(
  recipientId: string,
  onChange: () => void
): { unsubscribe: () => void } {
  const channel = supabase
    .channel(`notifications_${recipientId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${recipientId}`,
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}

const DEFAULT_NOTIFICATION_PREFERENCES = (
  userId: string
): NotificationPreferences => ({
  user_id: userId,
  in_app_enabled: true,
  booking_lifecycle_enabled: true,
  time_requests_enabled: true,
  priority_dm_enabled: true,
  email_enabled: false,
  push_enabled: false,
});

export async function getNotificationPreferences(
  userId: string
): Promise<{ success: boolean; data?: NotificationPreferences; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        "user_id, in_app_enabled, booking_lifecycle_enabled, time_requests_enabled, priority_dm_enabled, email_enabled, push_enabled"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      const defaults = DEFAULT_NOTIFICATION_PREFERENCES(userId);
      const saveResult = await upsertNotificationPreferences(userId, defaults);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }
      return { success: true, data: defaults };
    }

    return { success: true, data: data as NotificationPreferences };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to load notification preferences",
    };
  }
}

export async function upsertNotificationPreferences(
  userId: string,
  values: Partial<NotificationPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      user_id: userId,
      ...values,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to save notification preferences",
    };
  }
}
