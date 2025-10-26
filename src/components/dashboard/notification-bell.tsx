
"use client";

import * as React from "react";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where, orderBy, limit, doc, writeBatch } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Notification = {
    id: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: any; // Firestore Timestamp
};

export function NotificationBell() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const notificationsQuery = React.useMemo(() => {
    if (!firestore || !user?.id) return null;
    return query(
        collection(firestore, `users/${user.id}/notifications`), 
        orderBy("createdAt", "desc"),
        limit(20) // Limit to last 20 notifications in popover
    );
  }, [firestore, user?.id]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);
  const unreadCount = React.useMemo(() => notifications?.filter(n => !n.read).length || 0, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!firestore || !user?.id) return;

    // Mark as read
    const notifRef = doc(firestore, `users/${user.id}/notifications`, notification.id);
    await writeBatch(firestore).update(notifRef, { read: true }).commit();

    // Navigate
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!firestore || !user?.id || !notifications) return;

    const batch = writeBatch(firestore);
    notifications.filter(n => !n.read).forEach(n => {
        const notifRef = doc(firestore, `users/${user.id}/notifications`, n.id);
        batch.update(notifRef, { read: true });
    });
    await batch.commit();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 p-0"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
          )}
          <span className="sr-only">View notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Notifications</CardTitle>
                {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                        <Check className="mr-2 h-4 w-4" /> Mark all as read
                    </Button>
                )}
            </CardHeader>
            <CardContent className="py-2 max-h-96 overflow-y-auto">
                <div className="flex flex-col gap-2">
                {notifications && notifications.length > 0 ? (
                    notifications.map((n) => (
                    <div
                        key={n.id}
                        className={cn(
                            "flex items-start gap-3 rounded-lg p-3 text-sm transition-colors hover:bg-muted cursor-pointer",
                            !n.read && "bg-accent/50"
                        )}
                        onClick={() => handleNotificationClick(n)}
                    >
                        {!n.read && <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />}
                        <div className={cn("grid gap-1", n.read ? "pl-0" : "pl-0")}>
                            <p className="font-medium">{n.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ''}
                            </p>
                        </div>
                    </div>
                    ))
                ) : (
                    <p className="p-4 text-center text-sm text-muted-foreground">No new notifications.</p>
                )}
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/notifications">View All Notifications</Link>
                 </Button>
            </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
