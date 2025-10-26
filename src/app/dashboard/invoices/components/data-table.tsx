
// Updated: src/app/dashboard/invoices/components/data-table.tsx
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
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";


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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { GenerateInvoiceForm } from "./generate-invoice-form";
import { useRouter } from "next/navigation";
import { type Invoice } from "@/types/invoice";


type Client = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
};

type FileData = {
  id: string;
  fileName?: string;
};

const getStatusVariant = (status?: Invoice["paymentStatus"]) => {
  switch (status) {
    case "Paid":
      return "default";
    case "Partially Paid":
      return "secondary";
    case "Unpaid":
      return "outline";
    case "Overdue":
      return "destructive";
    default:
      return "outline";
  }
};

const currency = (amount?: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(amount ?? 0);

const fmtDate = (iso?: string | null) => (iso ? new Date(String(iso)).toLocaleDateString() : "-");

const recordPaymentSchema = z.object({
    amount: z.coerce.number().positive("Amount must be a positive number."),
    paymentDate: z.string().min(1, "Payment date is required."),
    paymentMethod: z.string().min(3, "Payment method is required.")
});


function RecordPaymentDialog({ invoice }: { invoice: Invoice }) {
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();
    const router = useRouter();

    const totalDue = (invoice.amount || 0);
    const balance = invoice.balance ?? totalDue;

    const form = useForm<z.infer<typeof recordPaymentSchema>>({
        resolver: zodResolver(recordPaymentSchema),
        defaultValues: {
            amount: balance > 0 ? balance : 0,
            paymentDate: new Date().toISOString().slice(0, 10),
            paymentMethod: "Bank Transfer",
        },
    });

    const handleRecordPayment = async (values: z.infer<typeof recordPaymentSchema>) => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Database unavailable" });
            return;
        }

        const invoiceRef = doc(firestore, "invoices", invoice.id);
        
        try {
            const newReceiptId = await runTransaction(firestore, async (tx) => {
                const invSnap = await tx.get(invoiceRef);
                if (!invSnap.exists()) {
                    throw new Error("Invoice not found.");
                }

                const currentData = invSnap.data() as Invoice;
                const currentAmountPaid = currentData.amountPaid || 0;
                const newAmountPaid = currentAmountPaid + values.amount;
                const totalAmount = currentData.amount || 0;
                const newBalance = totalAmount - newAmountPaid;

                let newStatus: Invoice['paymentStatus'] = "Partially Paid";
                if (newBalance <= 0) {
                    newStatus = "Paid";
                }

                tx.update(invoiceRef, { 
                    paymentStatus: newStatus,
                    amountPaid: newAmountPaid,
                    balance: newBalance,
                    lastPaymentAt: serverTimestamp(),
                });

                const newReceiptRef = doc(collection(firestore, "receipts"));
                tx.set(newReceiptRef, {
                    invoiceId: invoice.id,
                    clientId: invoice.clientId,
                    clientName: invoice.clientName,
                    amountPaid: values.amount,
                    paymentDate: new Date(values.paymentDate).toISOString(),
                    paymentMethod: values.paymentMethod,
                    reference: invoice.reference, // Include invoice reference
                    createdAt: serverTimestamp(),
                });

                return newReceiptRef.id;
            });
            
            toast({ title: "Payment Recorded", description: `Receipt created. Redirecting...` });
            router.push(`/dashboard/receipts/${newReceiptId}`);

        } catch (error: any) {
            console.error("Payment transaction failed:", error);
            toast({ variant: "destructive", title: "Payment Failed", description: error.message });
        }

        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Record Payment</DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment for Invoice</DialogTitle>
                    <DialogDescription>
                        For invoice <span className="font-mono font-medium">{invoice.id.substring(0,8)}</span>. Balance due is {currency(balance)}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleRecordPayment)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount Paid</FormLabel>
                                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Date</FormLabel>
                                    <FormControl><Input type="date" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>Record Payment</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function InvoiceDataTable({ data, clients, cases: files }: { data: Invoice[]; clients: Client[]; cases: FileData[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

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
      id: "client",
      header: "Client",
      cell: ({ row }) => {
        const inv = row.original;
        const client = inv.clientName ?? clients.find((c) => c.id === inv.clientId)?.name ?? `${clients.find((c) => c.id === inv.clientId)?.firstName ?? ""} ${clients.find((c) => c.id === inv.clientId)?.lastName ?? ""}`.trim();
        return <div>{client ?? "Unknown"}</div>;
      },
    },
    {
      accessorKey: "fileName",
      header: "File",
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => <div className="text-right font-medium">{currency(row.original.amount)}</div>,
    },
    {
      accessorKey: "balance",
      header: () => <div className="text-right">Balance Due</div>,
      cell: ({ row }) => <div className="text-right font-medium">{currency(row.original.balance ?? row.original.amount)}</div>,
    },
    {
      accessorKey: "paymentStatus",
      header: "Status",
      cell: ({ row }) => <Badge variant={getStatusVariant(row.getValue("paymentStatus") as any)}>{row.getValue("paymentStatus") ?? "Unpaid"}</Badge>,
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
                <RecordPaymentDialog invoice={invoice} />
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
          placeholder="Filter by client..."
          value={(table.getColumn("client")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("client")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <GenerateInvoiceForm clients={clients} cases={files} />
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
