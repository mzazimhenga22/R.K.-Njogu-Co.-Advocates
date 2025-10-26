// app/dashboard/clients/[id]/ClientDetailsClient.tsx
"use client";

import { useCollection, useDoc, useFirestore } from "@/firebase";
import { doc, collection, query, where, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { type Client } from "../page";
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
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

type Props = { id: string };

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

type CaseData = {
  id: string;
  caseName: string;
  clientId: string;
  status: "Open" | "In Progress" | "Closed" | "On Hold";
  filingDate: string;
  assignedPersonnelIds: string[];
};

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
};

export default function ClientDetailsClient({ id }: Props) {
  const firestore = useFirestore();

  // Primary client ref + hook
  const clientRef = useMemo(
    () => (firestore && id ? doc(firestore, "clients", id) : null),
    [firestore, id]
  );
  const { data: clientFromHook, isLoading: isClientLoading } =
    useDoc<Client>(clientRef);

  // Fallback state (manual getDoc)
  const [fallbackClient, setFallbackClient] = useState<
    Client | null | undefined
  >(undefined);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !id) {
      setFallbackClient(null);
      return;
    }
    if (clientFromHook) {
      setFallbackClient(clientFromHook);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        console.debug(
          "[ClientDetails] Hook returned null; trying manual getDoc for client:",
          id
        );
        const snap = await getDoc(doc(firestore, "clients", id));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as any;
          setFallbackClient({ ...(data as Client), id: snap.id });
          console.info("[ClientDetails] Manual getDoc found client:", snap.id);
        } else {
          setFallbackClient(null);
          console.warn("[ClientDetails] Manual getDoc: client not found:", id);
        }
      } catch (err: any) {
        console.error("[ClientDetails] getDoc fallback error:", err);
        setFallbackError(err?.message ?? String(err));
        setFallbackClient(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firestore, id, clientFromHook]);

  // cases query
  const casesQuery = useMemo(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, "cases"), where("clientId", "==", id));
  }, [firestore, id]);
  const { data: clientCases, isLoading: areCasesLoading } =
    useCollection<CaseData>(casesQuery);

  // users (for assigned personnel lookup)
  const usersQuery = useMemo(
    () => (firestore ? collection(firestore, "users") : null),
    [firestore]
  );
  const { data: users, isLoading: areUsersLoading } =
    useCollection<UserProfile>(usersQuery);

  const isLoading =
    isClientLoading || areCasesLoading || areUsersLoading || fallbackClient === undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  const client = clientFromHook ?? (fallbackClient === undefined ? null : fallbackClient);

  // Not found UI (friendly)
  if (!client) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Client not found</CardTitle>
            <CardDescription>
              We couldn't locate a client with ID <code className="break-all">{id}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This might be because the client was deleted, the ID is incorrect, or your account
              doesn't have permission to view it.
            </p>

            {fallbackError && (
              <div className="rounded bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Error:</strong> {fallbackError}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/clients">
                <Button variant="outline">Back to Clients</Button>
              </Link>
              <Button asChild>
                <a
                  href={`https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/~2Fclients~2F${encodeURIComponent(
                    id
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Firebase Console
                </a>
              </Button>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Debug: check the <code>clients</code> collection for the ID above and verify rules.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Map cases with assigned lawyer info
  const casesWithDetails = (clientCases ?? []).map((c) => {
    const advocate = users?.find((u) => c.assignedPersonnelIds?.includes(u.id));
    return {
      ...c,
      assignedLawyer: advocate ? `${advocate.firstName ?? ""} ${advocate.lastName ?? ""}`.trim() : "Unassigned",
      lastActivity: c.filingDate ? formatDistanceToNow(new Date(c.filingDate), { addSuffix: true }) : "N/A",
    };
  });

  const clientName =
    client.name ?? ((`${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()) || "Unknown Client");

  const phone = (client as any).phone ?? (client as any).phoneNumber ?? "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to clients</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline">{clientName}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p>{client.email ?? "N/A"}</p>
          </div>
          <div className="grid gap-1">
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p>{phone}</p>
          </div>
          <div className="grid gap-1 md:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">Address</p>
            <p>{client.address ?? "N/A"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Associated Cases</CardTitle>
            <CardDescription>This client has {casesWithDetails.length} associated case(s).</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/cases">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Case
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {casesWithDetails.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Title</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {casesWithDetails.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/cases/${encodeURIComponent(c.id)}`} className="hover:underline">
                          {c.caseName}
                        </Link>
                      </TableCell>
                      <TableCell>{c.assignedLawyer}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>{c.lastActivity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-md">
              No cases found for this client.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
