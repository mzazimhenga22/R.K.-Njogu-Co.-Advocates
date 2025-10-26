"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  FileText,
  BarChart2,
  Settings,
  UserSquare,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "../logo";
import { ScrollArea } from "../ui/scroll-area";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "lawyer", "secretary"] },
  { href: "/dashboard/clients", icon: Users, label: "Clients", roles: ["admin", "lawyer", "secretary"] },
  { href: "/dashboard/cases", icon: Briefcase, label: "Cases", roles: ["admin", "lawyer", "secretary"] },
  { href: "/dashboard/calendar", icon: Calendar, label: "Calendar", roles: ["admin", "lawyer", "secretary"] },
  { href: "/dashboard/advocates", icon: UserSquare, label: "Advocates", roles: ["admin", "lawyer"] },
  { href: "/dashboard/invoices", icon: FileText, label: "Invoicing", roles: ["admin", "secretary"] },
  { href: "/dashboard/receipts", icon: Receipt, label: "Receipts", roles: ["admin", "secretary"] },
  { href: "/dashboard/reports", icon: BarChart2, label: "Reports", roles: ["admin"] },
  { href: "/dashboard/settings", icon: Settings, label: "Settings", roles: ["admin"] },
];

export function MainNav({ className, isMobile = false }: { className?: string; isMobile?: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // show only items allowed for this user's role
  const accessibleNavItems = navItems.filter((item) => user?.role && item.roles.includes(user.role));

  const renderLink = (item: typeof navItems[0]) => {
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] shadow-sm"
            : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))]"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <item.icon className={cn("h-4 w-4", isActive ? "text-[hsl(var(--sidebar-accent-foreground))]" : "text-[hsl(var(--sidebar-foreground))]")} />
        <span>{item.label}</span>
      </Link>
    );
  };

  if (isMobile) {
    return (
      <nav key="mobile-nav" className={cn("grid gap-2 p-4 text-base font-medium", className)}>
        {accessibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-lg px-2.5 py-2 transition-colors duration-150",
                isActive
                  ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
                  : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-foreground))]"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <aside
      className={cn("hidden md:flex flex-col h-screen w-64", className)}
      // main border uses the sidebar-border token, background/text use sidebar variables defined in globals.css
      style={{
        borderRight: "1px solid hsl(var(--sidebar-border))",
        background: "hsl(var(--sidebar-background))",
        color: "hsl(var(--sidebar-foreground))",
      }}
    >
      {/* Header: logo image only (no text/title) */}
      <div
        className="flex items-center justify-center h-16 border-b"
        style={{
          borderBottom: "1px solid hsl(var(--sidebar-border))",
          background: "hsl(var(--sidebar-header))",
        }}
      >
        <Link href="/dashboard" aria-label="Go to dashboard">
          <Logo className="h-8 w-auto" />
        </Link>
      </div>

      {/* Navigation (scrollable) */}
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-3">{accessibleNavItems.map(renderLink)}</nav>
      </ScrollArea>

      {/* Footer */}
      <div
        className="py-3 text-center text-xs"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))", color: "hsl(var(--sidebar-muted-foreground, var(--sidebar-foreground)))" }}
      >
        © {new Date().getFullYear()} R.K. Njogu & Co.
      </div>
    </aside>
  );
}
