"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * ClientLayout handles authentication gating and smooth routing.
 * - If no user: redirect to /login
 * - If loading: show centered loading UI
 * - If authenticated: render children
 * Works seamlessly in both web and Electron builds.
 */
export default function ClientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    // Avoid redirect loop in Electron if app starts offline
    if (!loading && !user) {
      try {
        router.push("/login");
      } catch (err) {
        console.error("Redirect failed:", err);
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-gray-500">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto"></div>
          <p className="text-sm font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // When authenticated
  return <>{children}</>;
}
