"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";
import { UserManagementTable } from "./components/user-management-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Users } from "lucide-react";

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: "admin" | "lawyer" | "secretary";
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (user?.role === "admin" && firestore) {
      return collection(firestore, "users");
    }
    return null;
  }, [user, firestore]);

  const { data: users, isLoading: usersLoading } =
    useCollection<UserProfile>(usersQuery);

  const handleSaveChanges = (message: string) => {
    toast({
      title: "Settings Saved",
      description: message,
    });
  };

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "lawyer" | "secretary"
  ) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, "users", userId);
    try {
      await updateDoc(userDocRef, { role: newRole });
      toast({
        title: "User Updated",
        description: `User's role has been successfully changed to ${newRole}.`,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the user's role.",
      });
    }
  };

  const capitalizedRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "";

  return (
    <div className="grid gap-6">
      {/* Header and Manage Users Sheet */}
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        {user?.role === "admin" && (
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>User Management</SheetTitle>
                <SheetDescription>
                  Manage user roles and permissions across the application.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <UserManagementTable
                  users={users || []}
                  isLoading={usersLoading || authLoading}
                  onRoleChange={handleRoleChange}
                  currentUserId={user?.id || ""}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Profile Settings */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your personal user profile and access level.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <form className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  className="w-full"
                  defaultValue={user?.name}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="w-full"
                  defaultValue={user?.email}
                  readOnly
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  type="text"
                  className="w-full"
                  defaultValue={capitalizedRole}
                  readOnly
                  aria-disabled="true"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button
              onClick={() =>
                handleSaveChanges("Your profile settings have been updated.")
              }
            >
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* Firm & Billing Settings */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Firm & Billing Settings</CardTitle>
            <CardDescription>
              Manage your firm's official details for invoices, fee notes, and
              correspondence.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 flex-grow">
            <div className="grid gap-3">
              <Label htmlFor="firm-name">Firm Name</Label>
              <Input
                id="firm-name"
                type="text"
                defaultValue="R. K. Njogu & Co. Advocates"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="firm-address">Firm Address</Label>
              <Textarea
                id="firm-address"
                className="min-h-24"
                defaultValue={`R. K. NJOGU & CO., ADVOCATES
Rehema House, Standard Street
P.O. Box 57376-00200, Nairobi, Kenya
Tel: +254 20 2211234 | Email: info@rknjoguadvocates.com`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-3">
                <Label htmlFor="firm-email">Contact Email</Label>
                <Input
                  id="firm-email"
                  type="email"
                  defaultValue="info@rknjoguadvocates.com"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input id="tax-rate" type="number" defaultValue="16" />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="invoice-footer">Invoice Footer Text</Label>
              <Textarea
                id="invoice-footer"
                className="min-h-24"
                defaultValue={`Thank you for choosing R. K. Njogu & Co. Advocates.

Sincerely,
Kamau R. Njogu
R. K. Njogu & Co. Advocates`}
              />
            </div>
          </CardContent>

          <CardFooter className="border-t px-6 py-4">
            <Button
              onClick={() =>
                handleSaveChanges(
                  "Firm and billing settings have been updated."
                )
              }
            >
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <Switch
                  id="dark-mode"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
