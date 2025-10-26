
"use client";

import * as React from "react";
import { format } from "date-fns";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp } from "firebase/firestore";

import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScheduleAppointmentForm } from "./components/schedule-appointment-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentActions } from "./components/appointment-actions";

// Mirroring the Firestore structure
export type Appointment = {
  id: string;
  title: string;
  description: string;
  clientId: string;
  userId: string; // The user (advocate/admin) the appointment is with
  startTime: Timestamp;
  endTime: Timestamp;
  // For display purposes, we'll fetch these separately
  clientName?: string;
  userName?: string;
};

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
  role?: "admin" | "lawyer" | "secretary";
};

export default function CalendarPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const firestore = useFirestore();
  const { user } = useAuth();

  const appointmentsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "appointments") : null),
    [firestore]
  );
  const { data: appointments, isLoading: appointmentsLoading } =
    useCollection<Appointment>(appointmentsQuery);
    
  const clientsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "clients") : null),
    [firestore]
  );
  const { data: clients, isLoading: clientsLoading } = useCollection<Client>(clientsQuery);
  
  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "users") : null),
    [firestore]
  );
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const enrichedAppointments = React.useMemo(() => {
    if (!appointments || !clients || !users) return [];
    return appointments.map(app => {
      const client = clients.find(c => c.id === app.clientId);
      const userAssigned = users.find(u => u.id === app.userId);
      return {
        ...app,
        clientName: client ? (client.name || `${client.firstName} ${client.lastName}`) : 'Unknown Client',
        userName: userAssigned ? `${userAssigned.firstName} ${userAssigned.lastName}` : 'Unknown User'
      }
    });
  }, [appointments, clients, users]);
  

  const appointmentsForSelectedDay = React.useMemo(() => {
    if (!date || !enrichedAppointments) return [];
    const selectedDateStr = format(date, "yyyy-MM-dd");
    return enrichedAppointments
        .filter((appointment) => 
            format(appointment.startTime.toDate(), "yyyy-MM-dd") === selectedDateStr
        )
        .sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis());
  }, [date, enrichedAppointments]);
  

  const isLoading = appointmentsLoading || clientsLoading || usersLoading;
  const canSchedule = user?.role === "admin" || user?.role === "secretary";

  if (isLoading) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="flex justify-center p-0 sm:p-6">
                        <Skeleton className="h-[290px] w-full max-w-[320px] rounded-md" />
                    </CardContent>
                </Card>
             </div>
             <div>
                <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                           <Skeleton className="h-6 w-48" />
                           <Skeleton className="h-4 w-32" />
                        </div>
                         <Skeleton className="h-9 w-28" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-3 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                        </div>
                        <div className="p-3 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                        </div>
                    </CardContent>
                </Card>
             </div>
        </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              Appointment Scheduling
            </CardTitle>
            <CardDescription>
              Select a date to view and manage appointments.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-0 sm:p-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Appointments for{" "}
                  {date ? format(date, "MMM d, yyyy") : "..."}
                </CardTitle>
                <CardDescription>
                  {appointmentsForSelectedDay.length} appointments scheduled.
                </CardDescription>
              </div>
              {canSchedule && (
                <ScheduleAppointmentForm
                  clients={clients || []}
                  users={users || []}
                  selectedDate={date}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointmentsForSelectedDay.length > 0 ? (
              appointmentsForSelectedDay.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 bg-secondary rounded-lg relative group"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user && <AppointmentActions 
                      appointment={appointment} 
                      currentUserRole={user.role} 
                      currentUserId={user.id} 
                      clients={clients || []}
                      users={users || []}
                    />}
                  </div>
                  <p className="font-semibold pr-8">{appointment.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Client: {appointment.clientName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    With: {appointment.userName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(appointment.startTime.toDate(), "h:mm a")} -{" "}
                    {format(appointment.endTime.toDate(), "h:mm a")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No appointments for this day.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
