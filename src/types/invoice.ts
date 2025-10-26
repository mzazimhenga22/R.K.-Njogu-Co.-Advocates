export type Invoice = {
  id: string;
  clientId: string;
  clientName?: string | null;
  caseId?: string | null;
  caseName?: string | null;
  amount?: number | null;
  items?: { description: string; ref?: string; amount: number }[];
  invoiceDate?: string;
  dueDate?: string;
  paymentStatus?: "Paid" | "Unpaid" | "Overdue";
  description?: string | null;
  note?: string | null;
  reference?: string | null;
};
