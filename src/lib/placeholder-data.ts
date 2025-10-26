
export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  fileCount: number;
};

export type File = {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  assignedLawyer: string;
  status: "Open" | "In Progress" | "Closed" | "On Hold";
  lastActivity: string;
};

export type Invoice = {
  id: string;
  clientName: string;
  clientId: string;
  amount: number;
  status: "Paid" | "Due" | "Overdue";
  dueDate: string;
  issuedDate: string;
};

export type Appointment = {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  startTime: Date;
  endTime: Date;
};

export type Activity = {
  id: string;
  description: string;
  user: string;
  timestamp: string;
};

export type Receipt = {
    id: string;
    invoiceId: string;
    clientName: string;
    amountPaid: number;
    paymentDate: string;
    paymentMethod: string;
}

export let clients: Client[] = [
  { id: "CLI-001", name: "John Doe", email: "john.doe@example.com", phone: "555-0101", address: "123 Main St, Anytown", fileCount: 2 },
  { id: "CLI-002", name: "Jane Smith", email: "jane.smith@example.com", phone: "555-0102", address: "456 Oak Ave, Anytown", fileCount: 1 },
  { id: "CLI-003", name: "Peter Jones", email: "peter.jones@example.com", phone: "555-0103", address: "789 Pine Ln, Anytown", fileCount: 3 },
  { id: "CLI-004", name: "Mary Johnson", email: "mary.j@example.com", phone: "555-0104", address: "101 Maple Dr, Anytown", fileCount: 0 },
  { id: "CLI-005", name: "David Williams", email: "david.w@example.com", phone: "555-0105", address: "212 Birch Rd, Anytown", fileCount: 1 },
];

export const files: File[] = [
  { id: "FILE-001", title: "Corporate Restructuring", clientName: "John Doe", clientId: "CLI-001", assignedLawyer: "R.k Njogu", status: "In Progress", lastActivity: "2 days ago" },
  { id: "FILE-002", title: "Intellectual Property", clientName: "Jane Smith", clientId: "CLI-002", assignedLawyer: "Associate A", status: "Open", lastActivity: "5 hours ago" },
  { id: "FILE-003", title: "Litigation Dispute", clientName: "Peter Jones", clientId: "CLI-003", assignedLawyer: "R.k Njogu", status: "Closed", lastActivity: "1 month ago" },
  { id: "FILE-004", title: "Real Estate Transaction", clientName: "John Doe", clientId: "CLI-001", assignedLawyer: "Associate B", status: "On Hold", lastActivity: "1 week ago" },
  { id: "FILE-005", title: "Mergers and Acquisitions", clientName: "David Williams", clientId: "CLI-005", assignedLawyer: "R.k Njogu", status: "In Progress", lastActivity: "yesterday" },
];

export let appointments: Appointment[] = [];


export const activities: Activity[] = [
  { id: "ACT-001", description: "created a new invoice INV-004 for John Doe.", user: "Secretary", timestamp: "2 hours ago" },
  { id: "ACT-002", description: "updated status for file FILE-005 to In Progress.", user: "R.k Njogu", timestamp: "yesterday" },
  { id: "ACT-003", description: "added a new client Mary Johnson.", user: "Secretary", timestamp: "2 days ago" },
  { id: "ACT-004", description: "uploaded 'Discovery Documents.pdf' to FILE-001.", user: "Associate B", timestamp: "3 days ago" },
];

export let receipts: Receipt[] = [
    { id: "REC-001", invoiceId: "INV-001", clientName: "John Doe", amountPaid: 5000, paymentDate: "2024-05-10", paymentMethod: "Bank Transfer" }
];

export const financialData = [
  { month: "Jan", revenue: 4000 },
  { month: "Feb", revenue: 3000 },
  { month: "Mar", revenue: 5000 },
  { month: "Apr", revenue: 4500 },
  { month: "May", revenue: 6000 },
  { month: "Jun", revenue: 5500 },
];

export const caseOutcomesData = [
  { outcome: "Won", value: 12, fill: "hsl(var(--primary))" },
  { outcome: "Settled", value: 8, fill: "hsl(var(--accent))" },
  { outcome: "Lost", value: 3, fill: "hsl(var(--secondary))" },
  { outcome: "Dismissed", value: 5, fill: "hsl(var(--muted))" },
];

// Functions to update data
export const addAppointment = (appointment: Appointment) => {
    appointments.push(appointment);
    appointments.sort((a,b) => a.startTime.getTime() - b.startTime.getTime());
}

export const addFile = (newFile: File) => {
    files.unshift(newFile);
}

export const addReceipt = (receipt: Receipt) => {
    receipts.unshift(receipt);
}

    