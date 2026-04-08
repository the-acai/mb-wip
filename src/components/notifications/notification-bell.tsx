"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { getNotifications, getUnreadCount, markAllAsRead } from "@/lib/queries/notifications";
import { useUser } from "@/hooks/use-user";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    getUnreadCount(supabase).then(setUnreadCount);
  }, [user, supabase]);

  useEffect(() => {
    if (!open || !user) return;
    getNotifications(supabase, { limit: 20 }).then((data) => {
      setNotifications(data || []);
    });
  }, [open, user, supabase]);

  const handleNew = useCallback((notification: Record<string, unknown>) => {
    setUnreadCount((c) => c + 1);
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  useRealtimeNotifications(user?.id, handleNew);

  const handleMarkAllRead = async () => {
    await markAllAsRead(supabase);
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <NotificationList notifications={notifications} />
      </PopoverContent>
    </Popover>
  );
}
