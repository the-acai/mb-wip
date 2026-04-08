"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  actor: { full_name: string | null; email: string } | null;
  post: { id: string; title: string } | null;
}

interface NotificationListProps {
  notifications: Record<string, unknown>[];
}

function getNotificationText(notification: Notification) {
  const actorName =
    notification.actor?.full_name ||
    notification.actor?.email?.split("@")[0] ||
    "Someone";

  switch (notification.type) {
    case "comment":
      return `${actorName} commented on "${notification.post?.title || "a post"}"`;
    case "mention":
      return `${actorName} mentioned you in "${notification.post?.title || "a post"}"`;
    case "reaction":
      return `${actorName} reacted to "${notification.post?.title || "a post"}"`;
    default:
      return `${actorName} interacted with your post`;
  }
}

export function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No notifications yet
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-80">
      <div className="divide-y">
        {notifications.map((n) => {
          const notification = n as unknown as Notification;
          return (
            <Link
              key={notification.id}
              href={notification.post ? `/post/${notification.post.id}` : "#"}
              className={cn(
                "flex flex-col gap-1 px-4 py-3 text-sm transition-colors hover:bg-muted/50",
                !notification.read && "bg-muted/30"
              )}
            >
              <span className="text-foreground">
                {getNotificationText(notification)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                })}
              </span>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
}
