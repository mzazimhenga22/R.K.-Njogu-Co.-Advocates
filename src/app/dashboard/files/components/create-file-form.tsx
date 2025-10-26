
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCollection, useFirestore } from "@/firebase";
import {
  addDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Client } from "../../clients/page";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";

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

export function CreateFileForm() {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useAuth();

  const clientsQuery = React.useMemo(
    () => (firestore ? collection(firestore, "clients") : null),
    [firestore]
  );
  const { data: clients, isLoading: clientsLoading } =
    useCollection<Client>(clientsQuery);

  const advocatesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "users"),
      where("role", "in", ["lawyer", "admin"])
    );
  }, [firestore]);
  const { data: advocates, isLoading: advocatesLoading } =
    useCollection<UserProfile>(advocatesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fileName: "",
      fileDescription: "",
      status: "Open",
    },
  });

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
      
      // Log activity
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

      // Send notification to the assigned lawyer
      const lawyer = advocates.find(a => a.id === values.assignedLawyerId);
      const client = clients.find(c => c.id === values.clientId);
      const clientName = client ? (client.name || `${client.firstName} ${client.lastName}`) : 'the client';

      if (lawyer && lawyer.id !== user.id) { // Don't notify user of their own action
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
      form.reset({ fileName: "", fileDescription: "", status: "Open" });
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Create File
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
          <DialogDescription>
            Enter the details for the new file.
          </DialogDescription>
        </DialogHeader>
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Create File
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
