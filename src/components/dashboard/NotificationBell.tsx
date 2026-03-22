import { useState, useEffect } from "react";
import { Bell, CalendarCheck2, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MAX_NOTIFICATIONS } from "@/config/constants";
import {
  AppNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "@/services/notificationService";

interface NotificationBellProps {
  recipientId: string;
  onNavigateToView?: (view: string) => void;
}

export function NotificationBell({
  recipientId,
  onNavigateToView,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();

    const subscription = subscribeToNotifications(recipientId, () => {
      fetchNotifications(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [recipientId]);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const result = await listNotifications(recipientId, {
        limit: MAX_NOTIFICATIONS * 2,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch notifications");
      }

      const notifs = result.data;

      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const markAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id);
    if (!result.success) {
      console.error("Failed to mark notification as read:", result.error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              readAt: new Date().toISOString(),
              isRead: true,
            }
          : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const result = await markAllNotificationsAsRead(recipientId);
    if (!result.success) {
      console.error("Failed to mark all notifications as read:", result.error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt || new Date().toISOString(),
        isRead: true,
      }))
    );
    setUnreadCount(0);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking":
        return CalendarCheck2;
      case "priority_dm":
        return MessageCircle;
      case "review":
        return Star;
      case "booking_request":
        return CalendarCheck2;
      default:
        return Bell;
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (
      onNavigateToView &&
      notification.routeView &&
      ["sessions", "messages", "reviews", "requests", "time-request"].includes(notification.routeView)
    ) {
      onNavigateToView(notification.routeView);
    }

    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100 rounded-full"
        >
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs border-2 border-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] rounded-2xl border border-gray-200 bg-white shadow-xl p-0 overflow-hidden">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold text-gray-900">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-matepeak-primary hover:text-matepeak-secondary transition-colors"
            >
              Mark all as read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-5 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`px-4 py-3.5 cursor-pointer border-b border-gray-100 last:border-b-0 data-[highlighted]:bg-gray-50 focus:bg-gray-50 ${
                  !notif.isRead ? "bg-matepeak-primary/5" : "bg-white"
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex gap-3 w-full">
                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = getNotificationIcon(notif.type);
                      return <Icon className="h-5 w-5 text-gray-700" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {notif.body}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getTimeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="h-2.5 w-2.5 rounded-full bg-matepeak-primary mt-2" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">No notifications</p>
            <p className="text-xs text-gray-500 mt-1">
              You're all caught up!
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
