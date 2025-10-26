
"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, writeBatch, doc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check, MailWarning } from "lucide-react";
import { type Notification } from "@/components/dashboard/notification-bell";

export default function NotificationsPage() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();

    const notificationsQuery = React.useMemo(() => {
        if (!firestore || !user?.id) return null;
        return query(
            collection(firestore, `users/${user.id}/notifications`), 
            orderBy("createdAt", "desc")
        );
    }, [firestore, user?.id]);

    const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);
    const unreadCount = React.useMemo(() => notifications?.filter(n => !n.read).length || 0, [notifications]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!firestore || !user?.id) return;

        // Mark as read if it isn't already
        if (!notification.read) {
            const notifRef = doc(firestore, `users/${user.id}/notifications`, notification.id);
            await writeBatch(firestore).update(notifRef, { read: true }).commit();
        }

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
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Notifications</CardTitle>
                        <CardDescription>A complete history of your notifications.</CardDescription>
                    </div>
                    {unreadCount > 0 && (
                        <Button onClick={handleMarkAllAsRead}>
                            <Check className="mr-2 h-4 w-4" />
                            Mark All as Read
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2">
                        {notifications && notifications.length > 0 ? (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={cn(
                                        "flex items-start gap-4 rounded-xl p-4 text-sm transition-colors cursor-pointer border",
                                        !n.read ? "bg-accent/50 border-accent" : "bg-card hover:bg-muted/50",
                                    )}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    {!n.read && (
                                        <span className="flex h-3 w-3 translate-y-1.5 rounded-full bg-primary" />
                                    )}
                                    <div className={cn("grid gap-1 flex-1", n.read && "pl-7")}>
                                        <p className="font-semibold leading-snug">{n.message}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {n.createdAt ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-12 border-dashed border-2 rounded-lg">
                                <MailWarning className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">You're all caught up!</h3>
                                <p className="text-sm text-muted-foreground">You have no notifications at the moment.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
