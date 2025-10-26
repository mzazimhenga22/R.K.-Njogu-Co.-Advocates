"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

/**
 * Export the Receipt type so pages can import it and guarantee the same shape.
 */
export type Receipt = {
  id: string;
  invoiceId: string;
  clientId: string;
  clientName?: string;
  amountPaid: number;
  paymentDate?: string | any; // ISO string | Firestore Timestamp | number
  paymentMethod?: string | null;
  reference?: string | null;
  description?: string | null;
  notes?: string | null;
  createdAt?: any;
};

const currency = (amount?: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

const columns = (/* no dynamic columns for now */) =>
  [
    {
      accessorKey: "id",
      header: "Receipt ID",
      cell: ({ row }: any) => <span className="font-mono">{String(row.original.id).substring(0, 8)}...</span>,
    },
    {
      accessorKey: "invoiceId",
      header: "Invoice",
      cell: ({ row }: any) => (
        <Link
          href={`/dashboard/invoices/${row.original.invoiceId}`}
          className="hover:underline text-primary font-medium font-mono"
        >
          {String(row.original.invoiceId).substring(0, 8)}...
        </Link>
      ),
    },
    { accessorKey: "clientName", header: "Client" },
    {
      accessorKey: "amountPaid",
      header: () => <div className="text-right">Amount Paid</div>,
      cell: ({ row }: any) => {
        const amt = Number(row.getValue("amountPaid") ?? 0);
        return <div className="text-right font-medium">{currency(amt)}</div>;
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }: any) => {
        const value = row.getValue("paymentDate");
        try {
          if (!value) return "-";
          if (typeof value === "string") {
            const d = new Date(value);
            return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
          }
          if (typeof (value as any)?.toDate === "function") {
            return (value as any).toDate().toLocaleDateString();
          }
          const d = new Date(value as any);
          return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
        } catch {
          return "-";
        }
      },
    },
    { accessorKey: "paymentMethod", header: "Method" },
    {
      id: "actions",
      cell: ({ row }: any) => {
        const receipt: Receipt = row.original;
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
                <Link href={`/dashboard/receipts/${receipt.id}`}>View Receipt</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/invoices/${receipt.invoiceId}`}>Open Invoice</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ] as ColumnDef<Receipt>[];

type Props = {
  data: Receipt[];
};

export default function ReceiptDataTable({ data }: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns: columns(),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
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
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No receipts found.
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
