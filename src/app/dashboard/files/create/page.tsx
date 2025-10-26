
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCollection, useFirestore } from "@/firebase";
import { addDoc, collection, query, where, serverTimestamp } from "firebase/firestore";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { type Client } from "../../clients/page";

const formSchema = z.object({
  fileName: z.string().min(3, { message: "Title must be at least 3 characters." }),
  fileDescription: z.string().optional(),
  clientId: z.string({ required_error: "Please select a client." }),
  assignedLawyerId: z.string({ required_error: "Please assign a lawyer." }),
  status: z.enum(["Open", "In Progress", "On Hold", "Closed"]),
});

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export default function CreateFilePage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const clientsQuery = React.useMemo(() => (firestore ? collection(firestore, "clients") : null), [firestore]);
  const { data: clients, isLoading: clientsLoading } = useCollection<Client>(clientsQuery);

  const advocatesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), where("role", "in", ["lawyer", "admin"]));
  }, [firestore]);
  const { data: advocates, isLoading: advocatesLoading } = useCollection<UserProfile>(advocatesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fileName: "",
      fileDescription: "",
      status: "Open",
      clientId: preselectedClientId || "",
    },
  });
  
  React.useEffect(() => {
    if (preselectedClientId) {
      form.setValue("clientId", preselectedClientId);
    }
  }, [preselectedClientId, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !clients || !advocates || !user) return;

    try {
      const filesCollection = collection(firestore, "files");
      const fileRef = await addDoc(filesCollection, {
        fileName: values.fileName,
        fileDescription: values.fileDescription,
        clientId: values.clientId,
        assignedPersonnelIds: [values.assignedLawyerId],
        status: values.status,
        openingDate: new Date().toISOString(),
      });

      await addDoc(collection(firestore, "activities"), {
        type: "file:create",
        message: `New file "${values.fileName}" was created by ${user.name}.`,
        actorId: user.id,
        actorName: user.name,
        fileId: fileRef.id,
        meta: {
          clientId: values.clientId,
          assignedLawyerId: values.assignedLawyerId,
        },
        timestamp: serverTimestamp(),
      });
      
      const lawyer = advocates.find(a => a.id === values.assignedLawyerId);
      const client = clients.find(c => c.id === values.clientId);
      const clientName = client ? (client.name || `${client.firstName} ${client.lastName}`) : 'the client';

      if (lawyer && lawyer.id !== user.id) {
          await addDoc(collection(firestore, `users/${lawyer.id}/notifications`), {
              userId: lawyer.id,
              message: `You have been assigned to a new file: "${values.fileName}" for ${clientName}.`,
              link: `/dashboard/files/${fileRef.id}`,
              read: false,
              createdAt: serverTimestamp(),
          });
      }

      toast({
        title: "File created",
        description: `File "${values.fileName}" has been successfully created.`,
      });
      
      router.push(`/dashboard/files/${fileRef.id}`);

    } catch (error) {
      console.error("Error creating file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create file. Please try again.",
      });
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
        <CardHeader>
            <CardTitle>Create New File</CardTitle>
            <CardDescription>Enter the details for the new file.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="fileName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>File Title</FormLabel>
                    <FormControl>
                        <Input
                        placeholder="e.g., Corporate Restructuring"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="fileDescription"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>File Description</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Enter a detailed description of the matter..."
                        {...field}
                        className="resize-y"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                    >
                        <FormControl>
                        <SelectTrigger disabled={clientsLoading}>
                            <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                            {client.name || `${client.firstName} ${client.lastName}`}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="assignedLawyerId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Assigned Lawyer</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                    >
                        <FormControl>
                        <SelectTrigger disabled={advocatesLoading}>
                            <SelectValue placeholder="Select a lawyer" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {advocates?.map((lawyer) => (
                            <SelectItem key={lawyer.id} value={lawyer.id}>
                            {lawyer.firstName} {lawyer.lastName}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select initial status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>Create File</Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
