// Updated: src/app/dashboard/invoices/components/data-table.tsx
// - No major structural changes here — kept UI the same.
// - Import/usage unchanged; GenerateInvoiceForm remains the same component name.

"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { GenerateInvoiceForm } from "./generate-invoice-form";
import { useRouter } from "next/navigation";

export type Invoice = {
  id: string;
  clientId: string;
  clientName?: string | null;
  caseId?: string | null;
  caseName?: string | null;
  amount?: number | null;
  invoiceDate?: string;
  dueDate?: string;
  paymentStatus?: "Paid" | "Unpaid" | "Overdue";
  description?: string | null;
  reference?: string | null;
  items?: { description: string; ref?: string; amount: number }[];
  // new fields
  vendor?: string | null;
  purchaser?: string | null;
};

type Client = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
};

type Case = {
  id: string;
  caseName?: string;
};

const getStatusVariant = (status?: Invoice["paymentStatus"]) => {
  switch (status) {
    case "Paid":
      return "default";
    case "Unpaid":
      return "secondary";
    case "Overdue":
      return "destructive";
    default:
      return "outline";
  }
};

const currency = (amount?: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(amount ?? 0);

const fmtDate = (iso?: string | null) => (iso ? new Date(String(iso)).toLocaleDateString() : "-");

export function InvoiceDataTable({ data, clients, cases }: { data: Invoice[]; clients: Client[]; cases: Case[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();

  const computeAmount = (inv: Invoice) => {
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      return inv.items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    }
    return Number(inv.amount || 0);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (!firestore) {
      toast({ variant: "destructive", title: "Database unavailable", description: "Firestore not initialized." });
      return;
    }

    const invoiceRef = doc(firestore, "invoices", invoiceId);

    try {
      const newReceiptId = await runTransaction(firestore, async (tx) => {
        const invSnap = await tx.get(invoiceRef);
        if (!invSnap.exists()) {
          throw new Error("Invoice not found (maybe deleted).");
        }

        const invoiceData = invSnap.data() as any;
        if (invoiceData.paymentStatus === "Paid") {
          throw new Error("Invoice is already marked as Paid.");
        }

        tx.update(invoiceRef, { paymentStatus: "Paid", paidAt: serverTimestamp() });

        const receiptsCol = collection(firestore, "receipts");
        const newReceiptRef = doc(receiptsCol);
        const amount = computeAmount({ ...invoiceData, id: invoiceId } as Invoice);

        const receiptPayload = {
          invoiceId,
          clientId: invoiceData.clientId ?? null,
          clientName: invoiceData.clientName ?? null,
          amountPaid: amount,
          paymentDate: new Date().toISOString(),
          paymentMethod: "System Marked",
          reference: invoiceData.reference ?? null,
          description: invoiceData.description ?? null,
          notes: null,
          createdAt: serverTimestamp(),
        };

        tx.set(newReceiptRef, receiptPayload);

        return newReceiptRef.id;
      });

      if (newReceiptId) {
        toast({ title: "Invoice marked Paid", description: `Receipt created (${newReceiptId.substring(0,8)}...)` });
        router.push(`/dashboard/receipts/${newReceiptId}`);
      } else {
        toast({ variant: "destructive", title: "Unexpected error", description: "Receipt was not created." });
        console.warn("Transaction completed but no receipt id returned.");
      }
    } catch (err: any) {
      console.error("Error in handleMarkAsPaid transaction:", err);
      const msg = err?.message ?? String(err);

      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("permission-denied")) {
        toast({
          variant: "destructive",
          title: "Permission denied",
          description: "Firestore rules prevented writing the receipt. Check Firestore rules and authentication.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Could not mark paid",
          description: msg,
        });
      }
    }
  };

  const handleSendReminder = (invoice: Invoice) => {
    const clientDisplay =
      invoice.clientName ??
      clients.find((c) => c.id === invoice.clientId)?.name ??
      `${clients.find((c) => c.id === invoice.clientId)?.firstName ?? ""} ${clients.find((c) => c.id === invoice.clientId)?.lastName ?? ""}`.trim();

    toast({
      title: "Reminder Sent",
      description: `A payment reminder was sent for invoice ${invoice.id.substring(0, 8)}... to ${clientDisplay}.`,
    });
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "id",
      header: "Invoice ID",
      cell: ({ row }) => <Link href={`/dashboard/invoices/${row.original.id}`} className="hover:underline text-primary font-medium">{row.original.id.substring(0, 8)}...</Link>,
    },
    {
      accessorKey: "invoiceDate",
      header: "Invoice Date",
      cell: ({ row }) => fmtDate(row.getValue("invoiceDate") as string | undefined),
    },
    {
      id: "vendor",
      header: "Vendor",
      cell: ({ row }) => <div>{row.original.vendor ?? "-"}</div>,
    },
    {
      id: "purchaser",
      header: "Purchaser",
      cell: ({ row }) => <div>{row.original.purchaser ?? row.original.clientName ?? "-"}</div>,
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) => {
        const inv = row.original;
        const client = inv.clientName ?? clients.find((c) => c.id === inv.clientId)?.name ?? `${clients.find((c) => c.id === inv.clientId)?.firstName ?? ""} ${clients.find((c) => c.id === inv.clientId)?.lastName ?? ""}`.trim();
        return <div>{client ?? "Unknown"}</div>;
      },
    },
    {
      accessorKey: "caseName",
      header: "Case",
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const inv = row.original;
        const amount = computeAmount(inv);
        return <div className="text-right font-medium">{currency(amount)}</div>;
      },
    },
    {
      accessorKey: "paymentStatus",
      header: "Status",
      cell: ({ row }) => <Badge variant={getStatusVariant(row.getValue("paymentStatus") as any)}>{row.getValue("paymentStatus") ?? "Unpaid"}</Badge>,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => (row.getValue("dueDate") ? fmtDate(row.getValue("dueDate") as string) : "-"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/invoices/${invoice.id}`}>View Invoice</Link>
              </DropdownMenuItem>

              {invoice.paymentStatus !== "Paid" && (
                <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>Mark as Paid</DropdownMenuItem>
              )}

              {invoice.paymentStatus !== "Paid" && (
                <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>Send Reminder</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-3">
        <Input
          placeholder="Filter by client or purchaser..."
          value={(table.getColumn("client")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const q = event.target.value;
            table.getColumn("client")?.setFilterValue(q);
          }}
          className="max-w-sm"
        />
        <GenerateInvoiceForm clients={clients} cases={cases} />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}
