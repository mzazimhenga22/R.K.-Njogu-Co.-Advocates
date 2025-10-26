
// app/dashboard/clients/[id]/ClientDetailsClient.tsx
"use client";

import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";

type Props = { id: string };

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Open": case "Paid":
      return "default";
    case "In Progress": case "Unpaid":
      return "secondary";
    case "On Hold":
      return "outline";
    case "Closed": case "Overdue":
      return "destructive";
    default:
      return "default";
  }
};

const currency = (amount?: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount || 0);

type FileData = {
  id: string;
  fileName: string;
  clientId: string;
  status: "Open" | "In Progress" | "Closed" | "On Hold";
  openingDate: string;
  assignedPersonnelIds: string[];
};

type InvoiceData = {
    id: string;
    amount: number;
    invoiceDate: string;
    paymentStatus: "Paid" | "Unpaid" | "Overdue";
    fileName?: string;
};

type ReceiptData = {
    id: string;
    invoiceId: string;
    clientId: string; // Ensure clientId is part of the type
    amountPaid: number;
    paymentDate: string;
};

type AppointmentData = {
    id: string;
    title: string;
    startTime: any;
    userName: string;
}

type UserProfile = {
  id:string;
  firstName?: string;
  lastName?: string;
};

export default function ClientDetailsClient({ id }: Props) {
  const firestore = useFirestore();

  const clientRef = useMemoFirebase(() => (firestore && id ? doc(firestore, "clients", id) : null), [firestore, id]);
  const { data: clientFromHook, isLoading: isClientLoading } = useDoc<Client>(clientRef);

  const [fallbackClient, setFallbackClient] = useState<Client | null | undefined>(undefined);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !id) return setFallbackClient(null);
    if (clientFromHook) return setFallbackClient(clientFromHook);

    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "clients", id));
        if (cancelled) return;
        setFallbackClient(snap.exists() ? ({ ...(snap.data() as Client), id: snap.id }) : null);
      } catch (err: any) {
        setFallbackError(err?.message ?? String(err));
        setFallbackClient(null);
      }
    })();

    return () => { cancelled = true };
  }, [firestore, id, clientFromHook]);
  
  const filesQuery = useMemoFirebase(() => (firestore && id ? query(collection(firestore, "files"), where("clientId", "==", id)) : null), [firestore, id]);
  const { data: clientFiles, isLoading: filesLoading } = useCollection<FileData>(filesQuery);

  const invoicesQuery = useMemoFirebase(() => (firestore && id ? query(collection(firestore, "invoices"), where("clientId", "==", id)) : null), [firestore, id]);
  const { data: clientInvoices, isLoading: invoicesLoading } = useCollection<InvoiceData>(invoicesQuery);

  // Fetch ALL receipts, then filter client-side. This avoids needing a specific index.
  const allReceiptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, "receipts") : null), [firestore]);
  const { data: allReceipts, isLoading: receiptsLoading } = useCollection<ReceiptData>(allReceiptsQuery);

  const clientReceipts = useMemo(() => {
    if (!allReceipts || !id) return [];
    return allReceipts.filter(r => r.clientId === id);
  }, [allReceipts, id]);
  
  const appointmentsQuery = useMemoFirebase(() => (firestore && id ? query(collection(firestore, "appointments"), where("clientId", "==", id)) : null), [firestore, id]);
  const { data: clientAppointments, isLoading: appointmentsLoading } = useCollection<AppointmentData>(appointmentsQuery);

  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, "users") : null), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const isLoading = isClientLoading || filesLoading || usersLoading || invoicesLoading || receiptsLoading || appointmentsLoading || fallbackClient === undefined;
  
  const client = clientFromHook ?? (fallbackClient === undefined ? null : fallbackClient);

  const filesWithDetails = useMemo(() => (clientFiles ?? []).map((f) => {
    const advocate = users?.find((u) => f.assignedPersonnelIds?.includes(u.id));
    return {
      ...f,
      assignedLawyer: advocate ? `${advocate.firstName ?? ""} ${advocate.lastName ?? ""}`.trim() : "Unassigned",
      lastActivity: f.openingDate ? formatDistanceToNow(new Date(f.openingDate), { addSuffix: true }) : "N/A",
    };
  }), [clientFiles, users]);

  const appointmentsWithDetails = useMemo(() => (clientAppointments ?? []).map(app => {
      const userAssigned = users?.find(u => u.id === (app as any).userId);
      return {
          ...app,
          userName: userAssigned ? `${userAssigned.firstName} ${userAssigned.lastName}` : 'Unknown User'
      }
  }), [clientAppointments, users])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardHeader><CardTitle>Client not found</CardTitle><CardDescription>Could not find a client with ID <code className="break-all">{id}</code>.</CardDescription></CardHeader>
        <CardContent>
          {fallbackError && <div className="rounded bg-destructive/10 p-3 text-sm text-destructive"><strong>Error:</strong> {fallbackError}</div>}
          <Link href="/dashboard/clients" className="mt-4"><Button variant="outline">Back to Clients</Button></Link>
        </CardContent>
      </Card>
    );
  }

  const clientName = client.name ?? ((`${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()) || "Unknown Client");
  const phone = (client as any).phone ?? (client as any).phoneNumber ?? "N/A";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon"><Link href="/dashboard/clients"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back</span></Link></Button>
        <h1 className="text-3xl font-bold font-headline">{clientName}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1"><p className="text-sm font-medium text-muted-foreground">Email</p><p>{client.email ?? "N/A"}</p></div>
          <div className="grid gap-1"><p className="text-sm font-medium text-muted-foreground">Phone</p><p>{phone}</p></div>
          <div className="grid gap-1 md:col-span-2"><p className="text-sm font-medium text-muted-foreground">Address</p><p>{client.address ?? "N/A"}</p></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="files">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="files">Files ({filesWithDetails.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({clientInvoices?.length || 0})</TabsTrigger>
          <TabsTrigger value="receipts">Receipts ({clientReceipts.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({appointmentsWithDetails?.length || 0})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="files">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Associated Files</CardTitle>
                        <CardDescription>All legal matters associated with this client.</CardDescription>
                    </div>
                    <Button asChild size="sm"><Link href={`/dashboard/files/create?clientId=${id}`}><PlusCircle className="mr-2 h-4 w-4" /> Create New File</Link></Button>
                </CardHeader>
                <CardContent>
                    {filesWithDetails.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>File Title</TableHead><TableHead>Assigned To</TableHead><TableHead>Status</TableHead><TableHead>Last Activity</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filesWithDetails.map((f) => (
                                    <TableRow key={f.id}>
                                        <TableCell className="font-medium"><Link href={`/dashboard/files/${f.id}`} className="hover:underline text-primary">{f.fileName}</Link></TableCell>
                                        <TableCell>{f.assignedLawyer}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(f.status)}>{f.status}</Badge></TableCell>
                                        <TableCell>{f.lastActivity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-md">No files found for this client.</p>}
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="invoices">
            <Card>
                <CardHeader><CardTitle>Invoices</CardTitle><CardDescription>All invoices issued to this client.</CardDescription></CardHeader>
                <CardContent>
                     {clientInvoices && clientInvoices.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Invoice ID</TableHead><TableHead>File</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {clientInvoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium"><Link href={`/dashboard/invoices/${inv.id}`} className="hover:underline text-primary">{inv.id.substring(0, 8)}...</Link></TableCell>
                                        <TableCell>{inv.fileName || 'N/A'}</TableCell>
                                        <TableCell>{format(new Date(inv.invoiceDate), "PP")}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(inv.paymentStatus)}>{inv.paymentStatus}</Badge></TableCell>
                                        <TableCell className="text-right">{currency(inv.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-md">No invoices found for this client.</p>}
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="receipts">
             <Card>
                <CardHeader><CardTitle>Receipts</CardTitle><CardDescription>All payments received from this client.</CardDescription></CardHeader>
                <CardContent>
                     {clientReceipts && clientReceipts.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Receipt ID</TableHead><TableHead>Invoice ID</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount Paid</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {clientReceipts.map((rec) => (
                                    <TableRow key={rec.id}>
                                        <TableCell className="font-medium"><Link href={`/dashboard/receipts/${rec.id}`} className="hover:underline text-primary">{rec.id.substring(0, 8)}...</Link></TableCell>
                                        <TableCell><Link href={`/dashboard/invoices/${rec.invoiceId}`} className="hover:underline">{rec.invoiceId.substring(0, 8)}...</Link></TableCell>
                                        <TableCell>{format(new Date(rec.paymentDate), "PP")}</TableCell>
                                        <TableCell className="text-right">{currency(rec.amountPaid)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-md">No receipts found for this client.</p>}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="appointments">
             <Card>
                <CardHeader><CardTitle>Appointments</CardTitle><CardDescription>All scheduled appointments with this client.</CardDescription></CardHeader>
                <CardContent>
                     {appointmentsWithDetails && appointmentsWithDetails.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>With</TableHead><TableHead>Date & Time</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {appointmentsWithDetails.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell className="font-medium">{app.title}</TableCell>
                                        <TableCell>{app.userName}</TableCell>
                                        <TableCell>{format(app.startTime.toDate(), "PPpp")}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-md">No appointments found for this client.</p>}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
