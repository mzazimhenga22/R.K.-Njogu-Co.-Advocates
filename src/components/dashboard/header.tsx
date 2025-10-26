"use client";

import { UserNav } from "@/components/dashboard/user-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { MainNav } from "./main-nav";
import Link from "next/link";
import { Logo } from "../logo";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs bg-sidebar text-sidebar-foreground p-0">
          <div className="p-4 border-b border-sidebar-border">
             <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold font-headline">
                <Logo className="h-8 w-auto" />
            </Link>
          </div>
          <MainNav isMobile={true} />
        </SheetContent>
      </Sheet>

      <div className="ml-auto flex items-center space-x-4">
        <UserNav />
      </div>
    </header>
  );
}
