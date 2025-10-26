
"use client";

import { useCollection, useFirestore } from "@/firebase";
import { CaseDataTable } from "./components/data-table";
import { collection, doc } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { type Client } from "../clients/page";

// Extend Case type to include caseType
export type Case = {
  id: string;
  caseName: string;
  clientName: string;
  clientId: string;
  assignedLawyer: string;
  assignedLawyerId: string;
  status: "Open" | "In Progress" | "Closed" | "On Hold";
  filingDate: string;
  lastActivity: string;
  caseType?: string; // e.g., 'Corporate', 'Litigation', etc.
};

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type CaseData = Omit<Case, 'clientName' | 'assignedLawyer' | 'lastActivity'> & {
    assignedPersonnelIds?: string[];
};

export default function CasePage() {
  const firestore = useFirestore();

  const casesQuery = useMemo(
    () => (firestore ? collection(firestore, "cases") : null),
    [firestore]
  );
  const { data: casesFromDB, isLoading: casesLoading } =
    useCollection<CaseData>(casesQuery);

  const clientsQuery = useMemo(
    () => (firestore ? collection(firestore, "clients") : null),
    [firestore]
  );
  const { data: clients, isLoading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const usersQuery = useMemo(
    () => (firestore ? collection(firestore, "users") : null),
    [firestore]
  );
  const { data: users, isLoading: usersLoading } =
    useCollection<UserProfile>(usersQuery);

  const casesWithDetails = useMemo(() => {
    if (!casesFromDB || !clients || !users) return [];
    return casesFromDB.map((c) => {
      const client = clients.find((cli) => cli.id === c.clientId);
      const advocate = users.find(
        (u) => c.assignedPersonnelIds && c.assignedPersonnelIds.includes(u.id)
      );
      
      const clientName = client ? (client.name || `${client.firstName} ${client.lastName}`) : "Unknown";

      // Simple logic to derive caseType from caseName for charts
      const caseType = c.caseName.split(' ')[0];

      return {
        ...c,
        clientName: clientName,
        assignedLawyer: advocate
          ? `${advocate.firstName} ${advocate.lastName}`
          : "Unassigned",
        lastActivity: c.filingDate
          ? formatDistanceToNow(new Date(c.filingDate), { addSuffix: true })
          : "N/A",
        caseType: c.caseType || caseType,
      };
    });
  }, [casesFromDB, clients, users]);

  const isLoading = casesLoading || clientsLoading || usersLoading;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold font-headline mb-6">Case Tracking</h1>
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
      <h1 className="text-3xl font-bold font-headline mb-6">Case Tracking</h1>
      <CaseDataTable data={casesWithDetails} />
    </div>
  );
}
