
"use client";

import * as React from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { RevenueAnalysisChart } from "./components/revenue-analysis-chart";
import { AdvocateWorkloadChart } from "./components/advocate-workload-chart";
import { ClientAcquisitionChart } from "./components/client-acquisition-chart";
import { InvoiceStatusChart } from "./components/invoice-status-chart";
import { CaseTypeDistributionChart } from "./components/case-type-distribution-chart";
import { CaseOutcomesChart } from "./components/case-outcomes-chart";

import type { File as FileType } from "../files/page";
import type { Client } from "../clients/page";
import type { Invoice } from "../invoices/page";

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: "admin" | "lawyer" | "secretary";
};

export default function ReportsPage() {
  const firestore = useFirestore();
  const { user: currentUser, loading: authLoading } = useAuth();

  const usersQuery = useMemoFirebase(() => {
    if (firestore && currentUser?.role === "admin") {
      return collection(firestore, "users");
    }
    return null;
  }, [firestore, currentUser]);

  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
  const { data: files, isLoading: filesLoading } = useCollection<FileType>(
    useMemoFirebase(() => (firestore ? collection(firestore, "files") : null), [firestore])
  );
  const { data: clients, isLoading: clientsLoading } = useCollection<Client>(
    useMemoFirebase(() => (firestore ? collection(firestore, "clients") : null), [firestore])
  );
  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(
    useMemoFirebase(() => (firestore ? collection(firestore, "invoices") : null), [firestore])
  );

  const isLoading =
    authLoading ||
    filesLoading ||
    clientsLoading ||
    (currentUser?.role === "admin" && usersLoading) ||
    invoicesLoading;

  const advocates = React.useMemo(() => {
    if (!users) return [];
    return users.filter((u) => u.role === "lawyer" || u.role === "admin");
  }, [users]);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Only administrators can view performance reports. Please contact an admin if you
              believe this is a mistake.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ---- Derived Insights ----
  const totalClients = clients?.length || 0;
  const totalFiles = files?.length || 0;
  const totalInvoices = invoices?.length || 0;
  const totalAdvocates = advocates?.length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Firm Performance Overview
        </h1>
        <p className="text-muted-foreground">
          A quick snapshot of how your company and staff are performing this quarter.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-2xl font-semibold">{totalClients}</h3>
            <p className="text-sm text-muted-foreground">Active Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-2xl font-semibold">{totalFiles}</h3>
            <p className="text-sm text-muted-foreground">Open Files</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-2xl font-semibold">{totalAdvocates}</h3>
            <p className="text-sm text-muted-foreground">Active Advocates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-2xl font-semibold">{totalInvoices}</h3>
            <p className="text-sm text-muted-foreground">Invoices Issued</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Financial Health</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>
                Monthly revenue and outstanding balances from invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueAnalysisChart invoices={invoices || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Status</CardTitle>
              <CardDescription>
                Overview of paid, pending, and overdue invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceStatusChart invoices={invoices || []} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Team Performance */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Team Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Advocate Workload</CardTitle>
              <CardDescription>Active files assigned per advocate.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdvocateWorkloadChart cases={files || []} advocates={advocates} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Type Distribution</CardTitle>
              <CardDescription>Breakdown of files by type or category.</CardDescription>
            </CardHeader>
            <CardContent>
              <CaseTypeDistributionChart cases={files || []} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Client & File Insights */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Client & File Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Growth</CardTitle>
              <CardDescription>Number of new clients acquired each month.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientAcquisitionChart clients={clients || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Outcomes</CardTitle>
              <CardDescription>Closed file outcomes (based on status).</CardDescription>
            </CardHeader>
            <CardContent>
              <CaseOutcomesChart />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

    