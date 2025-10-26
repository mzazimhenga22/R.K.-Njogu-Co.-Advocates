
// src/app/dashboard/page.tsx
"use client";

import { Briefcase, Calendar, Users, FileText, IndianRupee } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CaseStatusChart } from "./components/case-status-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecentActivity } from "./components/recent-activity";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

import { type Invoice } from "./invoices/page";
import { type Client } from "./clients/page";
import { type File as FileType } from "./files/page";
import { type Appointment } from "./calendar/page";

// Import the Activity type that RecentActivity expects
import type { Activity as PlaceholderActivity } from "@/lib/placeholder-data";

/**
 * Raw Firestore activity doc shape (what we read from Firestore)
 */
type ActivityDoc = {
  id?: string;
  type?: string;
  message?: string;
  description?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  fileId?: string | null;
  meta?: Record<string, any> | null;
  timestamp?: any; // Firestore Timestamp | ISO string | number
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Open":
      return "default";
    case "In Progress":
      return "secondary";
    case "On Hold":
      return "outline";
    case "Closed":
      return "destructive";
    default:
      return "default";
  }
};

export default function DashboardPage() {
  const firestore = useFirestore();

  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(
    useMemoFirebase(() => (firestore ? collection(firestore, "invoices") : null), [firestore])
  );

  const { data: clients, isLoading: clientsLoading } = useCollection<Client>(
    useMemoFirebase(() => (firestore ? collection(firestore, "clients") : null), [firestore])
  );

  const { data: files, isLoading: filesLoading } = useCollection<FileType>(
    useMemoFirebase(() => (firestore ? collection(firestore, "files") : null), [firestore])
  );

  const { data: appointments, isLoading: appointmentsLoading } = useCollection<Appointment>(
    useMemoFirebase(() => (firestore ? collection(firestore, "appointments") : null), [firestore])
  );

  // Query recent activities (top-level collection)
  const activitiesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, "activities"), orderBy("timestamp", "desc"), limit(25))
        : null,
    [firestore]
  );
  const { data: activitiesDocs, isLoading: activitiesLoading } = useCollection<ActivityDoc>(activitiesQuery);

  const isLoading =
    invoicesLoading || clientsLoading || filesLoading || appointmentsLoading || activitiesLoading;

  const totalRevenue = React.useMemo(() => {
    return invoices?.filter((i) => i.paymentStatus === "Paid").reduce((acc, i) => acc + i.amount, 0);
  }, [invoices]);

  const upcomingAppointments = React.useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((a) => {
        const start =
          typeof (a.startTime as any)?.toDate === "function"
            ? (a.startTime as any).toDate()
            : new Date((a.startTime as any) ?? NaN);
        return start > new Date();
      })
      .sort((a, b) => {
        const aTime =
          typeof (a.startTime as any)?.toDate === "function"
            ? (a.startTime as any).toDate().getTime()
            : new Date((a.startTime as any) ?? 0).getTime();
        const bTime =
          typeof (b.startTime as any)?.toDate === "function"
            ? (b.startTime as any).toDate().getTime()
            : new Date((b.startTime as any) ?? 0).getTime();
        return aTime - bTime;
      })
      .slice(0, 5);
  }, [appointments]);

  const recentFiles = React.useMemo(() => {
    if (!files) return [];
    return [...files]
      .sort((a, b) => {
        const aT = new Date(a.openingDate ?? "").getTime() || 0;
        const bT = new Date(b.openingDate ?? "").getTime() || 0;
        return bT - aT;
      })
      .slice(0, 5);
  }, [files]);

  // Build an array shaped exactly like the placeholder Activity type expects.
  // We guarantee `description` is a string and `user` is a string (fallbacks).
  const recentActivities = React.useMemo(() => {
    if (!activitiesDocs) return [] as PlaceholderActivity[];

    const mapped = activitiesDocs.map((doc) => {
      // normalize timestamp -> Date | null
      const ts = doc.timestamp;
      let date: Date | null = null;
      if (!ts) {
        date = null;
      } else if (typeof ts === "string") {
        const parsed = new Date(ts);
        date = Number.isNaN(parsed.getTime()) ? null : parsed;
      } else if (typeof (ts as any)?.toDate === "function") {
        try {
          date = (ts as any).toDate();
        } catch {
          date = null;
        }
      } else if (typeof ts === "number") {
        date = new Date(ts);
      } else {
        const parsed = new Date(ts as any);
        date = Number.isNaN(parsed.getTime()) ? null : parsed;
      }

      // Build fields with guaranteed types expected by RecentActivity
      const id = doc.id ?? Math.random().toString(36).slice(2);
      const type = doc.type ?? "activity";
      const message = doc.message ?? (doc.type ? doc.type : "Activity");
      const description = (doc.description ?? (typeof doc.message === "string" ? doc.message : "") ) as string;
      const user = doc.actorName ?? "System"; // RecentActivity expects a user string
      const fileId = doc.fileId ?? null;
      const meta = doc.meta ?? null;
      const timestamp = date;
      const prettyTime = date ? format(date, "PPpp") : "Unknown";

      // Return an object matching PlaceholderActivity. We cast to the imported type to satisfy TS.
      return {
        id,
        type,
        message,
        description,
        user,
        caseId: fileId, // Keep caseId for compatibility with RecentActivity if needed, but points to fileId
        meta,
        timestamp,
        prettyTime,
      } as unknown as PlaceholderActivity;
    });

    return mapped;
  }, [activitiesDocs]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="lg:col-span-4 h-96" />
          <Skeleton className="lg:col-span-3 h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSH {(totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">from all paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{clients?.length || 0}</div>
            <p className="text-xs text-muted-foreground">managed in the system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Files</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {files?.filter((f) => f.status === "In Progress" || f.status === "Open").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">out of {files?.length || 0} total files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">in the future</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="file-insights">File Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Recent events across the system (latest first).</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length > 0 ? (
                  // Pass array typed as PlaceholderActivity[] so RecentActivity receives the exact type it expects
                  <RecentActivity activities={recentActivities as PlaceholderActivity[]} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">No recent activity found.</p>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>You have {upcomingAppointments.length} upcoming appointments.</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Date & Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              <div className="font-medium">{appointment.clientName}</div>
                            </TableCell>
                            <TableCell>{appointment.title}</TableCell>
                            <TableCell>
                              {format(
                                typeof (appointment.startTime as any)?.toDate === "function"
                                  ? (appointment.startTime as any).toDate()
                                  : new Date((appointment.startTime as any) ?? NaN),
                                "EEE, MMM d, yyyy 'at' h:mm a"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No upcoming appointments.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Recent Files</CardTitle>
                  <CardDescription>Five most recently opened files</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Title</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentFiles.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/files/${f.id}`} className="hover:underline">
                              {f.fileName}
                            </Link>
                          </TableCell>
                          <TableCell>{(f as any).clientName}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(f.status)}>{f.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="file-insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Recent Files</CardTitle>
                <CardDescription>A list of the 5 most recently opened files.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentFiles.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">
                          <Link href={`/dashboard/files/${f.id}`} className="hover:underline">
                            {f.fileName}
                          </Link>
                        </TableCell>
                        <TableCell>{(f as any).clientName}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(f.status)}>{f.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>File Status Distribution</CardTitle>
                <CardDescription>A visual breakdown of current file statuses.</CardDescription>
              </CardHeader>
              <CardContent>
                <CaseStatusChart cases={files || []} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    