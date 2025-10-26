
// src/app/dashboard/invoices/[id]/page.tsx
"use client";

import { useDoc, useFirestore } from "@/firebase";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";
import { type Invoice } from "@/types/invoice";

type Client = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  email?: string;
};

type FirmSettings = {
  name?: string;
  address?: string; // multi-line supported
  email?: string;
  phone?: string;
  footerText?: string;
  signatory?: string;
};

const getStatusVariant = (status: string | undefined) => {
  switch (status) {
    case "Paid":
      return "default";
    case "Partially Paid":
      return "secondary";
    case "Unpaid":
      return "outline";
    case "Overdue":
      return "destructive";
    default:
      return "outline";
  }
};

const currency = (amount?: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

const formatLongDate = (iso?: string | null) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const suffix = (n: number) => {
      if (n % 10 === 1 && n % 100 !== 11) return "st";
      if (n % 10 === 2 && n % 100 !== 12) return "nd";
      if (n % 10 === 3 && n % 100 !== 13) return "rd";
      return "th";
    };
    const month = d.toLocaleDateString(undefined, { month: "long" });
    const year = d.getFullYear();
    return `${day}${suffix(day)} ${month} ${year}`;
  } catch {
    return iso;
  }
};

const deriveFeeNoteNo = (invoice: Invoice | null, ourRef: string | null) => {
  if (!invoice && !ourRef) return "-";
  if (invoice?.feeNoteNo) return invoice.feeNoteNo;

  if (ourRef) {
    const nums = Array.from(ourRef.matchAll(/\d+/g)).map((m) => m[0]);
    const partA = nums[0] ?? "0";
    const partB = nums[2] ?? nums[1] ?? "0";
    const seqRaw = invoice?.feeSequence ?? nums[1] ?? "1";
    const seq = String(seqRaw).padStart(3, "0");
    return `${partA}/${partB}/${seq}`;
  }

  return invoice ? `FN-${invoice.id.slice(0, 6).toUpperCase()}` : "-";
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const firestore = useFirestore();

  const invoiceRef = useMemo(() => (firestore && id ? doc(firestore, "invoices", id) : null), [firestore, id]);
  const { data: invoiceFromHook, isLoading: isInvoiceLoading } = useDoc<Invoice>(invoiceRef);

  const [fallbackInvoice, setFallbackInvoice] = useState<Invoice | null>();
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  // Firm settings state (fetched from Firestore settings/firm)
  const [firm, setFirm] = useState<FirmSettings | null>(null);
  const [firmLoading, setFirmLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!firestore) {
      setFirm(null);
      setFirmLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const candidates = [
          doc(firestore, "settings", "firm"),
          doc(firestore, "settings", "company"),
          doc(firestore, "config", "firm"),
        ];
        for (const d of candidates) {
          const snap = await getDoc(d);
          if (cancelled) return;
          if (snap.exists()) {
            const data = snap.data() as any;
            const s: FirmSettings = {
              name: data.name ?? data.firmName ?? undefined,
              address: data.address ?? data.firmAddress ?? undefined,
              email: data.email ?? undefined,
              phone: data.phone ?? undefined,
              footerText: data.footerText ?? undefined,
              signatory: data.signatory ?? data.signatoryName ?? undefined,
            };
            setFirm(s);
            setFirmLoading(false);
            return;
          }
        }

        setFirm(null);
        setFirmLoading(false);
      } catch (err: any) {
        console.warn("Could not fetch firm settings:", err);
        setFirm(null);
        setFirmLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firestore]);

  useEffect(() => {
    if (!firestore || !id) {
      setFallbackInvoice(null);
      return;
    }
    if (invoiceFromHook) {
      setFallbackInvoice(invoiceFromHook);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(firestore, "invoices", id));
        if (cancelled) return;
        if (snap.exists()) {
          const invoiceData = snap.data() as Invoice;
          setFallbackInvoice({ ...invoiceData, id: snap.id });
        } else {
          setFallbackInvoice(null);
        }
      } catch (err: any) {
        setFallbackError(err?.message ?? String(err));
        setFallbackInvoice(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firestore, id, invoiceFromHook]);

  const invoice = invoiceFromHook ?? fallbackInvoice ?? null;

  const clientRef = useMemo(() => (firestore && invoice?.clientId ? doc(firestore, "clients", invoice.clientId) : null), [firestore, invoice]);
  const { data: clientFromHook, isLoading: isClientLoading } = useDoc<Client>(clientRef);

  const isLoading = isInvoiceLoading || isClientLoading || fallbackInvoice === undefined || firmLoading;

  const printableRef = useRef<HTMLDivElement | null>(null);

  const computeSubtotal = (items?: { amount: number }[]) => {
    if (Array.isArray(items) && items.length > 0) return items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    return 0;
  };

  const handleDownload = () => {
    if (!printableRef.current) return;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;

    w.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice?.id ?? ""}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding:24px; color:#111827;}
            .fee-table { width:100%; border-collapse:collapse; }
            .fee-table th, .fee-table td { padding:8px; border-bottom:1px solid #e5e7eb; text-align:left; vertical-align:top; }
            .fee-table thead th { background:#f3f4f6; font-weight:600; text-align:left; }
            .right { text-align:right; }
            .watermark-wrapper { position: relative; }
            .watermark-abs { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:0.06; }
            .watermark-abs svg { width:420px; height:auto; }
            .print-card { position:relative; z-index:1; background:transparent; }
            pre.firm-address { white-space: pre-line; font-size:12px; margin:0; }
            @media print {
              .watermark-abs { opacity:0.06 !important; }
            }
          </style>
        </head>
        <body>
          <div class="watermark-wrapper">
            <div class="watermark-abs">
              ${printableRef.current.querySelector(".invoice-watermark")?.innerHTML ?? ""}
            </div>
            <div class="print-card">${printableRef.current.innerHTML}</div>
          </div>
        </body>
      </html>
    `);

    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Invoice not found</CardTitle>
            <CardDescription>We couldn't find invoice with ID <code className="break-all">{id}</code>.</CardDescription>
          </CardHeader>
          <CardContent>
            {fallbackError && <div className="rounded bg-destructive/10 p-3 text-sm text-destructive"><strong>Error:</strong> {fallbackError}</div>}
            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/invoices"><Button variant="outline">Back to invoices</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sampleItems = [
    { description: "File Registration Fees", amount: 5000 },
    { description: "Drafting Fees for Sale Agreement, Spousal Consent and Transfer", amount: 15000 },
    { description: "Instruction Fees to Lodge Transfer and LCB Consent", amount: 30000 },
    { description: "Disbursements", amount: 10000 },
  ];

  const itemsToRender =
    Array.isArray(invoice.items) && invoice.items.length > 0
      ? invoice.items
      : invoice.amount
      ? [{ description: invoice.fileName ?? invoice.description ?? "Professional Fees", amount: invoice.amount, ref: invoice.reference ?? undefined }]
      : sampleItems;

  const totalAmount = computeSubtotal(itemsToRender);
  const amountPaid = invoice.amountPaid || 0;
  const balanceDue = totalAmount - amountPaid;


  const clientName =
    clientFromHook?.name ??
    (`${clientFromHook?.firstName ?? ""} ${clientFromHook?.lastName ?? ""}`.trim() ||
      invoice.clientName ||
      "NICODEMUS MATASA MBOGHO");

  const clientAddressFallback = (
    clientFromHook?.address ??
    (invoice.clientName ? "" : `P.O. BOX 61604 - 00200\nNAIROBI`)
  );

  const ourRef = invoice.reference ?? "RKN-3/NMM-001/25";
  const feeNoteNo = deriveFeeNoteNo(invoice, ourRef);

  const issuedDate = invoice.invoiceDate ? formatLongDate(invoice.invoiceDate) : "2nd July 2025";
  const reLine = invoice.fileName ?? invoice.description ?? "SALE & PURCHASE FOR L.R. NO. NAIROBI/BLOCK 126/2673";
  const vendor = (invoice as any).vendor ?? "STANLEY NGUGI MACHARIA";
  const purchaser = (invoice as any).purchaser ?? clientName;

  const firmNameTop = firm?.name ?? "R. K. NJOGU & CO. ADVOCATES";
  const firmAddressFallback =
    firm?.address ??
    `R. K. NJOGU & CO., ADVOCATES\nRehema House, Standard Street\nP.O. Box 57376-00200, Nairobi, Kenya\nTel: +254 20 2211234 | Email: info@rknjoguadvocates.com`;

  const firmSignatory = firm?.signatory ?? "Kamau R. Njogu";
  const firmFooterText = firm?.footerText ?? "Thank you for choosing R. K. Njogu & Co. Advocates";

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/invoices"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back</span></Link>
        </Button>
        <h1 className="text-3xl font-bold">Invoice Details</h1>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => alert("Send to client: implement email integration")}>
            <Send className="mr-2 h-4 w-4" /> Send
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download / Print
          </Button>
        </div>
      </div>

      <div ref={printableRef} className="relative">
        <div className="invoice-watermark" style={{ display: "none" }}>
          <Logo />
        </div>

        <Card className="p-6 relative z-10 bg-transparent">
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              opacity: 0.04,
              zIndex: 0,
            }}
          >
            <div style={{ width: 420, maxWidth: "70%" }}>
              <Logo />
            </div>
          </div>

          <CardHeader className="p-0 mb-4 z-20">
            {/* TOP: Logo + Address on their own */}
            <div className="flex flex-col items-center text-center pb-4">
              <Logo className="h-20 w-auto" />
              <div className="text-lg font-bold mt-2">{firmNameTop}</div>
              <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line max-w-2xl">
                <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-line" }}>{firmAddressFallback}</pre>
              </div>
            </div>

            <hr className="my-4 border-t" />

            {/* OFFICIAL FEE NOTE + LEFT DETAILS */}
            <div className="md:flex md:items-start md:justify-between gap-6">
              {/* LEFT: Bill To / RE / Vendor (stacked on the left) */}
              <div className="md:w-1/2">
                <div className="text-sm text-muted-foreground mb-1">Bill To</div>
                <div className="font-semibold">{clientName}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-line mt-2">{clientAddressFallback ?? "Address not available"}</div>

                <div className="mt-4 text-sm text-muted-foreground mb-1">RE:</div>
                <div className="font-semibold">{reLine}</div>

                <div className="mt-4 text-sm text-muted-foreground mb-1">VENDOR:</div>
                <div className="">{vendor}</div>

                <div className="mt-2 text-sm text-muted-foreground mb-1">PURCHASER:</div>
                <div className="">{purchaser}</div>
              </div>

              {/* RIGHT: Official Fee Note box */}
              <div className="md:w-1/3 text-right">
                <div className="text-sm font-semibold">OFFICIAL FEE NOTE</div>
                <div className="mt-2 text-sm text-muted-foreground">Our Ref: <span className="font-medium">{ourRef}</span></div>
                <div className="text-sm text-muted-foreground mt-1">Date: <span className="font-medium">{issuedDate}</span></div>
                <div className="mt-2"><Badge variant={getStatusVariant(invoice.paymentStatus)}>{invoice.paymentStatus ?? "Unpaid"}</Badge></div>
                <div className="mt-3 text-sm font-medium">Fee Note No: {feeNoteNo}</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 z-20">
            {/* horizontal rule before table */}
            <hr className="mb-4 border-t" />

            <div className="overflow-x-auto rounded-md border mb-4">
              <table className="w-full fee-table">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-semibold">#</th>
                    <th className="p-3 text-left font-semibold">PARTICULARS OF SERVICES RENDERED</th>
                    <th className="p-3 text-right font-semibold">AMOUNT (Kshs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsToRender.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-3 align-top">{idx + 1}</td>
                      <td className="p-3 align-top">
                        <div className="font-medium">{it.description}</div>
                        {it.ref && <div className="text-sm text-muted-foreground">Ref: {it.ref}</div>}
                      </td>
                      <td className="p-3 align-top right">{currency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-2">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{currency(totalAmount)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount Paid</span><span>- {currency(amountPaid)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>Balance Due</span><span>{currency(balanceDue)}</span></div>
              </div>
            </div>
          </CardContent>

          {/* Footer: Account details (left) | vertical divider | Signatory block (right) */}
          <CardFooter className="mt-6 p-0 text-sm text-muted-foreground z-20">
            <div className="flex flex-col md:flex-row items-start md:items-stretch gap-6">
              <div className="md:flex-1">
                <div className="font-medium">Account Details</div>
                <div>Account Name: R. K. Njogu & Company Advocates</div>
                <div>Account Number: 1192990075501</div>
                <div>Bank: CO-OPERATIVE BANK</div>
                <div>Branch: Kamulu Branch</div>

                <div className="mt-3 font-medium">Pay Via MPESA</div>
                <div>Paybill (Business No. 400 200; Account No. 4007 6427)</div>
              </div>

              {/* vertical divider */}
              <div className="hidden md:block w-px bg-muted-foreground/30" />

              <div className="md:flex-1">
                <div>With Compliments,</div>
                <div className="mt-4">
                  <div className="font-semibold">For: R. K. NJOGU & CO. ADV.</div>
                  <div className="mt-4">
                    <div>{firmSignatory}</div>
                    <div className="text-xs text-muted-foreground mt-2">{firmFooterText}</div>
                  </div>

                  <div className="mt-6 text-xs text-muted-foreground">{`Generated by ${firmNameTop}`}</div>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
