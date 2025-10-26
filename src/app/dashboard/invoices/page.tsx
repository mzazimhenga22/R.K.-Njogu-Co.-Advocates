
"use client";

import { useCollection, useFirestore } from "@/firebase";
import { InvoiceDataTable } from "./components/data-table";
import { collection } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type Invoice = {
  id: string;
  clientId: string;
  clientName?: string;
  fileId?: string;
  fileName?: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paymentStatus: "Paid" | "Unpaid" | "Overdue";
};

type Client = {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
}

type FileData = {
    id: string;
    fileName: string;
}

export default function InvoicePage() {
  const firestore = useFirestore();

  const invoicesQuery = useMemo(() => (firestore ? collection(firestore, "invoices") : null), [firestore]);
  const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesQuery);
  
  const clientsQuery = useMemo(() => (firestore ? collection(firestore, "clients") : null), [firestore]);
  const { data: clients, isLoading: clientsLoading } = useCollection<Client>(clientsQuery);
  
  const filesQuery = useMemo(() => (firestore ? collection(firestore, "files") : null), [firestore]);
  const { data: files, isLoading: filesLoading } = useCollection<FileData>(filesQuery);

  const enrichedInvoices = useMemo(() => {
    if (!invoices || !clients || !files) return [];
    return invoices.map(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      const fileData = files.find(f => f.id === inv.fileId);
      return {
        ...inv,
        clientName: client ? (client.name || `${client.firstName} ${client.lastName}`) : 'Unknown Client',
        fileName: fileData ? fileData.fileName : 'N/A'
      }
    });
  }, [invoices, clients, files]);

  const isLoading = invoicesLoading || clientsLoading || filesLoading;

  if (isLoading) {
     return (
      <div>
        <h1 className="text-3xl font-bold font-headline mb-6">Automated Invoicing</h1>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold font-headline mb-6">Automated Invoicing</h1>
      <InvoiceDataTable data={enrichedInvoices || []} clients={clients || []} cases={files || []} />
    </div>
  );
}

    