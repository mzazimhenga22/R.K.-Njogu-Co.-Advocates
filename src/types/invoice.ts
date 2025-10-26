
export type Invoice = {
  id: string;
  clientId: string;
  clientName?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  amount?: number | null;
  items?: { description: string; ref?: string; amount: number }[];
  invoiceDate?: string;
  dueDate?: string;
  paymentStatus?: "Paid" | "Unpaid" | "Overdue" | "Partially Paid";
  description?: string | null;
  note?: string | null;
  reference?: string | null;
  // New fields for partial payments
  amountPaid?: number;
  balance?: number;
  // New fields for detailed invoice
  vendor?: string | null;
  purchaser?: string | null;
  clientAddress?: string | null;
  feeNoteNo?: string | null;
  feeSequence?: string | number | null;
};
