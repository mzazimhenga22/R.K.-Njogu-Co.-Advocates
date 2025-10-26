
"use client";

import { useCollection, useFirestore } from "@/firebase";
import { FilesDataTable } from "./components/data-table";
import { collection, doc } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { type Client } from "../clients/page";

// Extend File type to include fileType
export type File = {
  id: string;
  fileName: string;
  clientName: string;
  clientId: string;
  assignedLawyer: string;
  assignedLawyerId: string;
  status: "Open" | "In Progress" | "Closed" | "On Hold";
  openingDate: string;
  lastActivity: string;
  fileType?: string; // e.g., 'Corporate', 'Litigation', etc.
};

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type FileData = Omit<File, 'clientName' | 'assignedLawyer' | 'lastActivity'> & {
    assignedPersonnelIds?: string[];
};

export default function FilesPage() {
  const firestore = useFirestore();

  const filesQuery = useMemo(
    () => (firestore ? collection(firestore, "files") : null),
    [firestore]
  );
  const { data: filesFromDB, isLoading: filesLoading } =
    useCollection<FileData>(filesQuery);

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

  const filesWithDetails = useMemo(() => {
    if (!filesFromDB || !clients || !users) return [];
    return filesFromDB.map((f) => {
      const client = clients.find((cli) => cli.id === f.clientId);
      const advocate = users.find(
        (u) => f.assignedPersonnelIds && f.assignedPersonnelIds.includes(u.id)
      );
      
      const clientName = client ? (client.name || `${client.firstName} ${client.lastName}`) : "Unknown";

      // Simple logic to derive fileType from fileName for charts
      const fileType = f.fileName.split(' ')[0];

      return {
        ...f,
        clientName: clientName,
        assignedLawyer: advocate
          ? `${advocate.firstName} ${advocate.lastName}`
          : "Unassigned",
        lastActivity: f.openingDate
          ? formatDistanceToNow(new Date(f.openingDate), { addSuffix: true })
          : "N/A",
        fileType: f.fileType || fileType,
      };
    });
  }, [filesFromDB, clients, users]);

  const isLoading = filesLoading || clientsLoading || usersLoading;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold font-headline mb-6">File Tracking</h1>
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
      <h1 className="text-3xl font-bold font-headline mb-6">File Tracking</h1>
      <FilesDataTable data={filesWithDetails} />
    </div>
  );
}

    