"use client";

import { MainNav } from "@/components/dashboard/main-nav";
import { DashboardHeader } from "@/components/dashboard/header";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/logo";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-gray-500">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto"></div>
          <p className="text-sm font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) return null; // Prevents flicker while redirecting

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <MainNav />
      <div className="flex flex-col">
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <Logo className="w-1/2 h-auto opacity-10" />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
