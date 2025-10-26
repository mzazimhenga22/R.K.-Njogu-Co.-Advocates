"use client";

import { useCollection, useFirestore } from "@/firebase";
import ReceiptDataTable, { type Receipt as ReceiptType } from "./components/data-table";
import { collection } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { type Client } from "../clients/page";

/**
 * If you keep a local Receipt type, prefer to reuse the Receipt type
 * exported by the table component to avoid mismatches.
 *
 * This file reads raw documents from Firestore (useCollection) and maps
 * them into the ReceiptType[] shape expected by ReceiptDataTable.
 */

export default function ReceiptPage() {
  const firestore = useFirestore();

  const receiptsQuery = useMemo(() => (firestore ? collection(firestore, "receipts") : null), [firestore]);
  const { data: receipts, isLoading: receiptsLoading } = useCollection<Record<string, any>>(receiptsQuery);

  const clientsQuery = useMemo(() => (firestore ? collection(firestore, "clients") : null), [firestore]);
  const { data: clients, isLoading: clientsLoading } = useCollection<Client>(clientsQuery);

  const enrichedReceipts = useMemo<ReceiptType[]>(() => {
    if (!receipts) return [];
    // Map each raw doc to the exported ReceiptType
    return receipts.map((rec) => {
      const client = clients?.find((c) => c.id === rec.clientId);
      const clientName = client
        ? (client.name || `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim())
        : rec.clientName ?? "Unknown Client";

      return {
        id: rec.id,
        invoiceId: rec.invoiceId,
        clientId: rec.clientId,
        clientName,
        amountPaid: Number(rec.amountPaid ?? 0),
        paymentDate: rec.paymentDate ?? rec.createdAt ?? rec.paymentDate,
        paymentMethod: rec.paymentMethod ?? rec.method ?? null,
        reference: rec.reference ?? null,
        description: rec.description ?? null,
        notes: rec.notes ?? null,
        createdAt: rec.createdAt ?? null,
      } as ReceiptType;
    });
  }, [receipts, clients]);

  const isLoading = receiptsLoading || clientsLoading;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold font-headline mb-6">Receipts</h1>
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
      <h1 className="text-3xl font-bold font-headline mb-6">Receipts</h1>

      {/* data matches ReceiptDataTable's exported Receipt type */}
      <ReceiptDataTable data={enrichedReceipts} />
    </div>
  );
}
