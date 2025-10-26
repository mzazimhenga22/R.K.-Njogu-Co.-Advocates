
// ========================================================================
// Updated: src/app/dashboard/invoices/components/generate-invoice-form.tsx
// - Added clientAddress field (textarea) and option to save it to client profile.
// - When a client is selected, purchaser + clientAddress auto-fill from clients list.
// - On submit: invoice document now contains purchaser/vendor/invoiceDate/paymentStatus and clientAddress (as part of invoice). Optionally updates client doc with address.
// - DialogContent made scrollable (max-height + overflow auto) so long forms scroll on small screens.

"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore } from "@/firebase";
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Client = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  email?: string;
};

type FileData = {
  id: string;
  fileName?: string;
};

const Money = z.coerce
  .number({ invalid_type_error: "Amount must be a number" })
  .nonnegative({ message: "Amount must be non-negative" });

const itemSchema = z.object({
  description: z.string().min(1, "Item description required"),
  ref: z.string().optional(),
  amount: Money,
});

const formSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  fileId: z.string().optional(),
  amount: Money.optional(),
  dueDate: z.string().min(1, "Due date required"),
  reference: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  items: z.array(itemSchema).optional(),
  // New fields
  vendor: z.string().optional(),
  purchaser: z.string().optional(),
  invoiceDate: z.string().optional(), // ISO date string (yyyy-mm-dd)
  paymentStatus: z.enum(["Paid", "Unpaid", "Overdue"]).optional(),
  clientAddress: z.string().optional(),
  saveAddressToClient: z.boolean().optional(),
  feeNoteNo: z.string().optional(),
  feeSequence: z.union([z.string(), z.number()]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function GenerateInvoiceForm({ clients, cases: files }: { clients: Client[]; cases: FileData[] }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      fileId: "none",
      amount: undefined,
      dueDate: "",
      reference: "",
      description: "",
      note: "",
      items: [],
      vendor: "",
      purchaser: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      paymentStatus: "Unpaid",
      clientAddress: "",
      saveAddressToClient: false,
      feeNoteNo: "",
      feeSequence: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // When client changes, auto-fill purchaser and clientAddress from client record
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "clientId") {
        const clientId = value.clientId;
        const client = clients.find((c) => c.id === clientId);
        const clientName = client?.name ?? `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim() ?? "";
        if (clientName) {
          form.setValue("purchaser", clientName, { shouldValidate: false, shouldDirty: true });
        }
        if (client?.address) {
          form.setValue("clientAddress", client.address, { shouldValidate: false, shouldDirty: true });
        } else {
          // clear previous address if switching to a client without an address
          form.setValue("clientAddress", "", { shouldValidate: false, shouldDirty: true });
        }
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, form.watch]);

  const computeSubtotalFromValues = (values: FormValues) => {
    if (values.items && values.items.length > 0) {
      return values.items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    }
    return Number(values.amount || 0);
  };

  async function onSubmit(values: FormValues) {
    if (!firestore) {
      toast({ variant: "destructive", title: "Error", description: "Database not ready" });
      return;
    }

    try {
      const subtotal = computeSubtotalFromValues(values);
      const clientObj = clients.find((c) => c.id === values.clientId) ?? null;
      const fileObj = files.find((f) => f.id === values.fileId) ?? null;

      const clientName =
        clientObj?.name ??
        (`${clientObj?.firstName ?? ""} ${clientObj?.lastName ?? ""}`.trim() || null);

      const invoiceDoc: any = {
        clientId: values.clientId,
        clientName: clientName,
        clientAddress: values.clientAddress ?? null, // store on invoice as well (useful if client record not updated)
        fileId: values.fileId && values.fileId !== "none" ? values.fileId : null,
        fileName: fileObj?.fileName ?? null,
        amount: subtotal,
        items: values.items ?? [],
        description: values.description ?? null,
        note: values.note ?? null,
        reference: values.reference ?? null,
        // new fields
        vendor: values.vendor ?? null,
        purchaser: values.purchaser ?? clientName ?? null,
        invoiceDate: values.invoiceDate ? new Date(values.invoiceDate).toISOString() : new Date().toISOString(),
        dueDate: values.dueDate,
        paymentStatus: (values.paymentStatus as "Paid" | "Unpaid" | "Overdue") ?? "Unpaid",
        feeNoteNo: values.feeNoteNo || null,
        feeSequence: values.feeSequence || null,
        createdAt: serverTimestamp(),
      };

      // create invoice doc
      await addDoc(collection(firestore, "invoices"), invoiceDoc);

      // Optionally update client record with address
      if (values.saveAddressToClient && values.clientAddress && values.clientId) {
        try {
          const clientRef = doc(firestore, "clients", values.clientId);
          await updateDoc(clientRef, { address: values.clientAddress });
        } catch (err) {
          // Non-fatal — show a toast but don't block invoice creation
          console.warn("Could not save client address:", err);
          toast({
            variant: "default",
            title: "Address not saved",
            description: "Failed to save address to client record.",
          });
        }
      }

      toast({
        title: "Invoice Generated",
        description: `Invoice for ${invoiceDoc.clientName ?? invoiceDoc.purchaser ?? "client"} created.`,
      });

      form.reset({
        clientId: "",
        fileId: "none",
        amount: undefined,
        dueDate: "",
        reference: "",
        description: "",
        note: "",
        items: [],
        vendor: "",
        purchaser: "",
        invoiceDate: new Date().toISOString().slice(0, 10),
        paymentStatus: "Unpaid",
        clientAddress: "",
        saveAddressToClient: false,
        feeNoteNo: "",
        feeSequence: "",
      });
      setOpen(false);
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message ?? "Failed to generate invoice.",
      });
    }
  }

  // live subtotal for display (keeps UI responsive)
  const watchedValues = form.watch();
  const liveSubtotal = computeSubtotalFromValues(watchedValues as FormValues);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Generate Invoice
        </Button>
      </DialogTrigger>

      {/* DialogContent updated to be scrollable on smaller screens */}
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Generate New Invoice</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-2">
            {/* Client and File */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related File (optional)</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a file" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="none" value="none">
                            — None —
                          </SelectItem>
                          {files.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.fileName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates, Reference, Amount */}
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || "Unpaid"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unpaid">Unpaid</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                 <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Our Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. RKN-3/NMM-001/25" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                 <FormField
                control={form.control}
                name="feeNoteNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Note No.</FormLabel>
                    <FormControl>
                      <Input placeholder="Overrides auto-generated" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Vendor / Purchaser */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor name" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchaser (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Purchaser name" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Client Address + save option */}
            <div className="grid gap-4 md:grid-cols-1">
              <FormField
                control={form.control}
                name="clientAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Address (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="P.O. BOX / Street / Town (multi-line supported)" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground mt-1">If you want this address saved to the client profile, tick the box below.</div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="saveAddressToClient"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <input
                        id="saveAddress"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="saveAddress" className="text-sm">
                        Save this address to the client profile
                      </label>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Description & Notes */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Short description" value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes or remarks" value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Line Items</div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => append({ description: "", ref: "", amount: 0 })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {fields.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                     <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total Amount (KSH)</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Total amount for this invoice"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>
                )}
                {fields.map((fieldItem, idx) => (
                  <div key={fieldItem.id} className="grid gap-2 md:grid-cols-12 items-end">
                    <div className="md:col-span-6">
                      <FormField
                        control={form.control}
                        name={`items.${idx}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Service description" value={field.value || ""} onChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${idx}.ref`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ref</FormLabel>
                            <FormControl>
                              <Input placeholder="Ref/Code" value={field.value || ""} onChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${idx}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (KSH)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => remove(idx)}
                        className="h-9 w-full"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-4 pt-2">
              <div className="text-sm text-muted-foreground">
                <div>
                  Subtotal:{" "}
                  <span className="font-medium">
                    KSH{" "}
                    {liveSubtotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="text-xs">VAT (16%) will be calculated on export.</div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Generate
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
