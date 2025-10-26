
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
  Query,
  DocumentData,
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

const formSchema = z.object({
  caseName: z.string().min(3, { message: "Title must be at least 3 characters." }),
  caseDescription: z.string().optional(),
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

export function CreateCaseForm() {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

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
      caseName: "",
      caseDescription: "",
      status: "Open",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !clients || !advocates) return;

    try {
      const casesCollection = collection(firestore, "cases");
      await addDoc(casesCollection, {
        caseName: values.caseName,
        caseDescription: values.caseDescription,
        clientId: values.clientId,
        assignedPersonnelIds: [values.assignedLawyerId],
        status: values.status,
        filingDate: new Date().toISOString(),
      });

      toast({
        title: "Case created",
        description: `Case "${values.caseName}" has been successfully created.`,
      });
      form.reset({ caseName: "", caseDescription: "", status: "Open" });
      setOpen(false);
    } catch (error) {
      console.error("Error creating case:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create case. Please try again.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Create Case
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Enter the details for the new case file.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="caseName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Title</FormLabel>
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
              name="caseDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a detailed description of the case..."
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
                Create Case
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
