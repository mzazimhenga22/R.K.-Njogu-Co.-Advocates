
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, setHours, setMinutes } from "date-fns";
import { useFirestore } from "@/firebase";
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { doc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { MoreVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { type Appointment } from "../page";

type Client = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
};

const formSchema = z.object({
  title: z
    .string()
    .min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().optional(),
  clientId: z.string({ required_error: "Please select a client." }),
  userId: z.string({ required_error: "Please select a user." }),
  date: z.string(),
  startTime: z.string({ required_error: "Please select a start time." }),
  endTime: z.string({ required_error: "Please select an end time." }),
});

type AppointmentActionsProps = {
  appointment: Appointment;
  currentUserRole: "admin" | "lawyer" | "secretary";
  currentUserId: string;
  clients: Client[];
  users: UserProfile[];
};

export function AppointmentActions({ appointment, currentUserRole, currentUserId, clients, users }: AppointmentActionsProps) {
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: appointment.title || "",
      description: appointment.description || "",
      clientId: appointment.clientId || "",
      userId: appointment.userId || "",
      date: format(appointment.startTime.toDate(), "yyyy-MM-dd"),
      startTime: format(appointment.startTime.toDate(), "HH:mm"),
      endTime: format(appointment.endTime.toDate(), "HH:mm"),
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;

    const [startHour, startMinute] = values.startTime.split(":").map(Number);
    const [endHour, endMinute] = values.endTime.split(":").map(Number);
    const appointmentDate = new Date(values.date);
    const startTime = setMinutes(setHours(appointmentDate, startHour), startMinute);
    const endTime = setMinutes(setHours(appointmentDate, endHour), endMinute);

    if (startTime >= endTime) {
      form.setError("endTime", { type: "manual", message: "End time must be after start time." });
      return;
    }

    const appointmentDocRef = doc(firestore, "appointments", appointment.id);
    const updatedData = {
      title: values.title,
      description: values.description,
      clientId: values.clientId,
      userId: values.userId,
      startTime: startTime,
      endTime: endTime,
    };
    
    setDocumentNonBlocking(appointmentDocRef, updatedData, { merge: true });

    toast({ title: "Appointment Updated", description: "The appointment has been successfully updated." });
    setIsEditOpen(false);
  };

  const handleDelete = () => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "appointments", appointment.id));
    toast({ title: "Appointment Canceled", description: "The appointment has been canceled." });
    setIsDeleteOpen(false);
  };
  
  const canUpdate = currentUserRole === 'admin' || (currentUserRole === 'lawyer' && appointment.userId === currentUserId);
  const canCancel = currentUserRole === 'admin';
  const canReschedule = currentUserRole === 'admin' || (currentUserRole === 'lawyer' && appointment.userId === currentUserId);

  if (!canUpdate && !canCancel && !canReschedule) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {canUpdate && <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>Update</DropdownMenuItem>}
          {canReschedule && <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>Reschedule</DropdownMenuItem>}
          {canCancel && <DropdownMenuItem onSelect={() => setIsDeleteOpen(true)} className="text-destructive">Cancel</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit/Reschedule Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Appointment</DialogTitle>
            <DialogDescription>Modify the appointment details.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                  </FormControl><SelectContent>
                      {clients.map(client => <SelectItem key={client.id} value={client.id}>{client.name || `${client.firstName} ${client.lastName}`}</SelectItem>)}
                  </SelectContent></Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem><FormLabel>With (User)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                  </FormControl><SelectContent>
                      {users.map(user => <SelectItem key={user.id} value={user.id}>{`${user.firstName} ${user.lastName}`}</SelectItem>)}
                  </SelectContent></Select><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently cancel the appointment
              for "{appointment.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
