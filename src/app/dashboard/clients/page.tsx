
"use client";

import { useCollection, useFirestore } from "@/firebase";
import { ClientDataTable } from "./components/data-table";
import { collection, query, where } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type Client = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  address: string;
  fileCount: number;
  createdAt?: string; // Made optional
};

type FileData = {
  id: string;
  clientId: string;
};

export default function ClientPage() {
  const firestore = useFirestore();

  const clientsQuery = useMemo(
    () => (firestore ? collection(firestore, "clients") : null),
    [firestore]
  );
  const { data: clientsFromDB, isLoading: clientsLoading } =
    useCollection<Omit<Client, "fileCount">>(clientsQuery);

  const filesQuery = useMemo(
    () => (firestore ? collection(firestore, "files") : null),
    [firestore]
  );
  const { data: files, isLoading: filesLoading } =
    useCollection<FileData>(filesQuery);

  const clientsWithFileCount = useMemo(() => {
    if (!clientsFromDB || !files) return [];
    return clientsFromDB.map((client) => {
      const count = files.filter((f) => f.clientId === client.id).length;
      return {
        ...client,
        fileCount: count,
      };
    });
  }, [clientsFromDB, files]);

  const isLoading = clientsLoading || filesLoading;

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold font-headline mb-6">
          Client Management
        </h1>
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
      <h1 className="text-3xl font-bold font-headline mb-6">
        Client Management
      </h1>
      <ClientDataTable data={clientsWithFileCount || []} />
    </div>
  );
}

    