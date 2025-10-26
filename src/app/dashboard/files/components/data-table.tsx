
// app/dashboard/files/datatable.tsx
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, PlusCircle, MoreHorizontal, Link as LinkIcon, FileText } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { CreateFileForm } from "./create-file-form"
import { type File } from "../page"
import { formatDistanceToNow } from "date-fns"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useFirestore, useFirebaseApp } from "@/firebase"
import { addDoc, collection } from "firebase/firestore"

import UploadDocumentDialog from "../[id]/upload-document-dialog";// new component (see file below)

const getStatusVariant = (status: File["status"]) => {
  switch (status) {
    case "Open":
      return "default"
    case "In Progress":
      return "secondary"
    case "On Hold":
      return "outline"
    case "Closed":
      return "destructive"
    default:
      return "default"
  }
}

const addDocumentFormSchema = z.object({
  fileName: z.string().min(3, "File name must be at least 3 characters."),
  fileUrl: z.string().url("Please enter a valid URL."),
});


function AddDocumentLinkDialog({ fileId, fileName }: { fileId: string; fileName: string }) {
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const form = useForm<z.infer<typeof addDocumentFormSchema>>({
      resolver: zodResolver(addDocumentFormSchema),
      defaultValues: {
        fileName: "",
        fileUrl: "",
      },
    });

    const handleAddLink = async (values: z.infer<typeof addDocumentFormSchema>) => {
        if (!firestore) return;

        try {
          const documentsCollectionRef = collection(firestore, `files/${fileId}/documents`);
          await addDoc(documentsCollectionRef, {
            ...values,
            fileId: fileId,
            uploadDate: new Date().toISOString(),
            fileType: "link",
            fileSize: null,
          });
          toast({
              title: "Document Link Added",
              description: `A link to "${values.fileName}" has been added to the file.`,
          });
          form.reset();
          setOpen(false);
        } catch (error) {
          console.error("Error adding document link:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to add document link. Please try again.",
          });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Add Document Link
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Document Link</DialogTitle>
                    <DialogDescription>
                        Add a link to a document for file: <span className="font-semibold">{fileName}</span>
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddLink)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="fileName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Document Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Client Agreement" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="fileUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Document URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://docs.google.com/..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                <LinkIcon className="mr-2 h-4 w-4"/> Add Link
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const columns: ColumnDef<File>[] = [
  {
    accessorKey: "fileName",
    header: "File Title",
    cell: ({ row }) => {
        const singleFile = row.original;
        return (
             <Link href={`/dashboard/files/${singleFile.id}`} className="font-medium text-primary hover:underline">
                {singleFile.fileName}
            </Link>
        )
    }
  },
  {
    accessorKey: "clientName",
    header: "Client",
  },
  {
    accessorKey: "assignedLawyer",
    header: "Assigned To",
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Badge variant={getStatusVariant(row.getValue("status"))}>
        {row.getValue("status")}
      </Badge>
    ),
  },
   {
    accessorKey: "lastActivity",
    header: "Last Activity",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const singleFile = row.original
      const { toast } = useToast()
      
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
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(singleFile.id)
                toast({
                  description: "File ID copied to clipboard.",
                })
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Copy file ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/files/${singleFile.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                View file details
              </Link>
            </DropdownMenuItem>

            {/* Upload document (file) */}
            <UploadDocumentDialog fileId={singleFile.id} fileName={singleFile.fileName} />

            {/* Add link fallback */}
            <AddDocumentLinkDialog fileId={singleFile.id} fileName={singleFile.fileName} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function FilesDataTable({ data }: { data: File[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by file title..."
          value={(table.getColumn("fileName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("fileName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <CreateFileForm />
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No files found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

    