"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search, FileText, User, Briefcase } from "lucide-react";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { useRouter } from "next/navigation";

type Client = { id: string; name?: string; firstName?: string; lastName?: string };
type File = { id: string; fileName: string };
type Invoice = { id: string; clientName?: string };

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const firestore = useFirestore();
  const router = useRouter();

  // Load all data upfront.
  // Note: For very large datasets, consider a dedicated search service like Algolia or Typesense.
  const { data: clients } = useCollection<Client>(React.useMemo(() => (firestore ? collection(firestore, "clients") : null), [firestore]));
  const { data: files } = useCollection<File>(React.useMemo(() => (firestore ? collection(firestore, "files") : null), [firestore]));
  const { data: invoices } = useCollection<Invoice>(React.useMemo(() => (firestore ? collection(firestore, "invoices") : null), [firestore]));

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  
  const handleSelect = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-4 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <span className="sr-only">Search</span>
         <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
            <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {clients && clients.length > 0 && (
            <CommandGroup heading="Clients">
              {clients.map((client) => (
                <CommandItem key={`client-${client.id}`} onSelect={() => handleSelect(`/dashboard/clients/${client.id}`)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>{client.name || `${client.firstName} ${client.lastName}`}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {files && files.length > 0 && (
            <CommandGroup heading="Files">
              {files.map((file) => (
                <CommandItem key={`file-${file.id}`} onSelect={() => handleSelect(`/dashboard/files/${file.id}`)}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>{file.fileName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {invoices && invoices.length > 0 && (
            <CommandGroup heading="Invoices">
              {invoices.map((invoice) => (
                <CommandItem key={`invoice-${invoice.id}`} onSelect={() => handleSelect(`/dashboard/invoices/${invoice.id}`)}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Invoice #{invoice.id.substring(0, 7)}... for {invoice.clientName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
