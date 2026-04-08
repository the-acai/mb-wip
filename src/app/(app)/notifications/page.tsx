import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/queries/notifications";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const notifications = await getNotifications(supabase, { limit: 50 });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <div className="rounded-lg border">
        <NotificationList notifications={notifications || []} />
      </div>
    </div>
  );
}
