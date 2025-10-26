
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { collection, query, where } from "firebase/firestore";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: "admin" | "lawyer" | "secretary";
};

type CaseData = {
  id: string;
  caseName: string;
  clientId: string;
  status: "Open" | "In Progress" | "Closed" | "On Hold";
  assignedPersonnelIds?: string[];
};

type Client = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Open":
      return "default";
    case "In Progress":
      return "secondary";
    case "On Hold":
      return "outline";
    case "Closed":
      return "destructive";
    default:
      return "default";
  }
};

export default function AdvocatesPage() {
  const firestore = useFirestore();

  const advocatesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, "users"),
            where("role", "in", ["lawyer", "admin"])
          )
        : null,
    [firestore]
  );
  const { data: advocates, isLoading: advocatesLoading } =
    useCollection<UserProfile>(advocatesQuery);

  const casesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "cases") : null),
    [firestore]
  );
  const { data: cases, isLoading: casesLoading } =
    useCollection<CaseData>(casesQuery);
    
  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "clients") : null),
    [firestore]
  );
  const { data: clients, isLoading: clientsLoading } = useCollection<Client>(clientsQuery);


  const casesWithClientNames = useMemo(() => {
    if (!cases || !clients) return [];
    return cases.map(c => {
        const client = clients.find(cli => cli.id === c.clientId);
        return {
            ...c,
            clientName: client ? (client.name || `${client.firstName} ${client.lastName}`) : 'Unknown Client'
        }
    })
  }, [cases, clients]);

  const isLoading = advocatesLoading || casesLoading || clientsLoading;

  if (isLoading) {
    return (
        <div>
            <h1 className="text-3xl font-bold font-headline mb-6">Advocates</h1>
            <div className="grid gap-6">
                {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center gap-4">
                             <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-6 w-48 mb-2" />
                            <div className="rounded-md border p-2 space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold font-headline mb-6">Advocates</h1>
      <div className="grid gap-6">
        {advocates?.map((advocate) => {
          const assignedCases = casesWithClientNames.filter(
            (c) => c.assignedPersonnelIds && c.assignedPersonnelIds.includes(advocate.id)
          );
          const advocateName = `${advocate.firstName} ${advocate.lastName}`;
          const avatarFallback = `${advocate.firstName?.[0] || ''}${advocate.lastName?.[0] || ''}`;

          return (
            <Card key={advocate.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{avatarFallback}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{advocateName}</CardTitle>
                  <CardDescription className="capitalize">{advocate.role}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">
                  Assigned Cases ({assignedCases.length})
                </h3>
                {assignedCases.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Case Title</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedCases.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/dashboard/cases/${c.id}`}
                                className="hover:underline"
                              >
                                {c.caseName}
                              </Link>
                            </TableCell>
                            <TableCell>{c.clientName}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(c.status)}>
                                {c.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-md">
                    No cases assigned.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
