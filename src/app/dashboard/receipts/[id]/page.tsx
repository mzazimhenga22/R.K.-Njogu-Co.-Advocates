// src/app/dashboard/receipts/[id]/page.tsx
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
import { ArrowLeft, Download } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { type Client } from "../../clients/page";
import { Logo } from "@/components/logo";

const currency = (amount?: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);

// Receipt shape we expect
export type Receipt = {
  id: string;
  invoiceId: string;
  clientId: string;
  clientName?: string | null;
  amountPaid: number;
  paymentDate?: string | any;
  paymentMethod?: string | null;
  reference?: string | null;
  description?: string | null;
  notes?: string | null;
};

type FirmSettings = {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
  footerText?: string;
  signatory?: string;
};

// ---- single Invoice type (use this throughout the file) ----
type Invoice = {
  items?: { description: string; ref?: string; amount: number }[];
  amount?: number;
  caseName?: string;
  description?: string;
  reference?: string;
};
// ------------------------------------------------------------

export default function ReceiptDetailsPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const firestore = useFirestore();

  const receiptRef = useMemo(
    () => (firestore && id ? doc(firestore, "receipts", id) : null),
    [firestore, id]
  );
  const { data: receipt, isLoading: isReceiptLoading } = useDoc<Receipt>(receiptRef);

  const clientRef = useMemo(
    () =>
      firestore && receipt?.clientId ? doc(firestore, "clients", receipt.clientId) : null,
    [firestore, receipt]
  );
  const { data: client, isLoading: isClientLoading } = useDoc<Client>(clientRef);

  // Invoice hook (uses the Invoice type above)
  const invoiceRef = useMemo(
    () => (firestore && receipt?.invoiceId ? doc(firestore, "invoices", receipt.invoiceId) : null),
    [firestore, receipt?.invoiceId]
  );
  const { data: invoice, isLoading: isInvoiceLoading } = useDoc<Invoice>(invoiceRef);

  // optional: fetch firm settings like on the invoice to keep header consistent
  const [firm, setFirm] = useState<FirmSettings | null>(null);
  const [firmLoading, setFirmLoading] = useState(true);

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
            setFirm({
              name: data.name ?? data.firmName ?? undefined,
              address: data.address ?? data.firmAddress ?? undefined,
              email: data.email ?? undefined,
              phone: data.phone ?? undefined,
              footerText: data.footerText ?? undefined,
              signatory: data.signatory ?? data.signatoryName ?? undefined,
            });
            setFirmLoading(false);
            return;
          }
        }
        setFirm(null);
        setFirmLoading(false);
      } catch (err) {
        setFirm(null);
        setFirmLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firestore]);

  const isLoading = isReceiptLoading || isClientLoading || firmLoading || isInvoiceLoading;
  const printableRef = useRef<HTMLDivElement | null>(null);

  const handleDownload = () => {
    if (printableRef.current) {
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) return;
      w.document.write(`
        <html>
          <head>
            <title>Receipt ${receipt?.id ?? ""}</title>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <style>
              body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding:24px; color:#111827}
              .fee-table { width:100%; border-collapse:collapse; }
              .fee-table th, .fee-table td { padding:8px; border-bottom:1px solid #e5e7eb; text-align:left; vertical-align:top; }
              .fee-table thead th { background:#f3f4f6; font-weight:600; text-align:left; }
              .right { text-align:right; }
              .watermark-wrapper { position: relative; }
              .watermark-abs { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; opacity:0.06; }
              .print-card { position:relative; z-index:1; background:transparent; }
              pre.firm-address { white-space: pre-line; font-size:12px; margin:0; }
            </style>
          </head>
          <body>
            <div class="print-card">${printableRef.current.innerHTML}</div>
          </body>
        </html>
      `);
      w.document.close();
      setTimeout(() => {
        w.focus();
        w.print();
      }, 300);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-[700px] w-full" />
      </div>
    );
  }

  if (!id) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Missing receipt id</CardTitle>
            <CardDescription>
              The URL does not include a receipt id. Make sure you're visiting a URL like <code>/dashboard/receipts/&lt;receiptId&gt;</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              If you landed here after marking an invoice paid, ensure the app redirected using the **receipt document id** (not the invoice id).
            </div>

            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/receipts"><Button variant="outline">Back to receipts</Button></Link>
              <Link href="/dashboard/invoices"><Button variant="ghost">View invoices</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Receipt not found</CardTitle>
            <CardDescription>
              We couldn't find a receipt with ID <code className="break-all">{id}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Quick checks:
              <ul className="list-disc ml-6 mt-2">
                <li>Confirm the receipt exists in Firestore console (collection: <code>receipts</code>).</li>
                <li>Confirm the URL contains the receipt <strong>document id</strong> (not the invoice id).</li>
                <li>Check browser console for Firestore permission errors (e.g. <code>permission-denied</code>).</li>
              </ul>
            </div>

            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/receipts"><Button variant="outline">Back to receipts</Button></Link>
              <Link href="/dashboard/invoices"><Button variant="ghost">View invoices</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientName = client
    ? client.name || `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()
    : receipt.clientName ?? "Unknown Client";

  const clientAddress = client
    ? client.address ?? "Address not available"
    : "Address not available";

  const parsePaymentDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === "string") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === "number") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof (val as any)?.toDate === "function") {
      try {
        return (val as any).toDate();
      } catch {
        return null;
      }
    }
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const paymentDateParsed = parsePaymentDate(receipt.paymentDate);
  const paymentDateLabel = paymentDateParsed ? paymentDateParsed.toLocaleDateString() : (receipt.paymentDate ? String(receipt.paymentDate) : "Unknown");

  const firmNameTop = firm?.name ?? "R. K. NJOGU & CO. ADVOCATES";
  const firmAddressFallback =
    firm?.address ??
    `R. K. NJOGU & CO., ADVOCATES\nRehema House, Standard Street\nP.O. Box 57376-00200, Nairobi, Kenya\nTel: +254 20 2211234 | Email: info@rknjoguadvocates.com`;

  const firmSignatory = firm?.signatory ?? "Kamau R. Njogu";
  const firmFooterText = firm?.footerText ?? "Thank you for choosing R. K. Njogu & Co. Advocates";

  // itemsToRender and reference are computed below (invoice hook moved earlier)
  const itemsToRender =
    Array.isArray(invoice?.items) && invoice!.items!.length > 0
      ? invoice!.items!
      : invoice?.amount
      ? [{ description: invoice.caseName ?? invoice.description ?? "Professional Fees", amount: invoice.amount, ref: invoice.reference }]
      : [
          { description: "File Registration Fees", amount: 5000 },
          { description: "Drafting Fees for Sale Agreement, Spousal Consent and Transfer", amount: 15000 },
          { description: "Instruction Fees to Lodge Transfer and LCB Consent", amount: 30000 },
          { description: "Disbursements", amount: 10000 },
        ];

  const reference = (receipt as any).reference ?? invoice?.reference ?? `Payment reference for invoice ${receipt.invoiceId ?? "—"}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/receipts">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to receipts</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Receipt Details</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download / Print
          </Button>
        </div>
      </div>

      <div ref={printableRef} className="relative">
        <Card className="p-6 relative z-10 bg-transparent">
          {/* Top: logo + firm address centered */}
          <CardHeader className="p-0 mb-4 z-20">
            <div className="flex flex-col items-center text-center pb-4">
              <Logo className="h-20 w-auto" />
              <div className="text-lg font-bold mt-2">{firmNameTop}</div>
              <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line max-w-2xl">
                <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-line" }}>{firmAddressFallback}</pre>
              </div>
            </div>

            <hr className="my-4 border-t" />

            <div className="md:flex md:items-start md:justify-between gap-6">
              {/* LEFT: Received From / Invoice info */}
              <div className="md:w-1/2">
                <div className="text-sm text-muted-foreground mb-1">Received From</div>
                <div className="font-semibold">{clientName}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-line mt-2">{clientAddress}</div>

                <div className="mt-4 text-sm text-muted-foreground mb-1">Reference</div>
                <div className="text-sm">{reference}</div>
              </div>

              {/* RIGHT: Official Receipt block */}
              <div className="md:w-1/3 text-right">
                <div className="text-sm font-semibold">OFFICIAL RECEIPT</div>
                <div className="text-xl font-bold mt-1">#{receipt.id}</div>

                <div className="mt-2 text-sm text-muted-foreground">Date: <span className="font-medium">{paymentDateLabel}</span></div>
                <div className="text-sm text-muted-foreground mt-1">Method: <span className="font-medium">{receipt.paymentMethod ?? "—"}</span></div>

                <div className="mt-3">
                  <Link href={`/dashboard/invoices/${receipt.invoiceId}`} className="text-primary underline">
                    View Original Invoice
                  </Link>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 z-20">
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
                        {it.ref && <div className="text-sm text-muted-foreground mt-1">Ref: {it.ref}</div>}
                      </td>
                      <td className="p-3 align-top right">{currency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Paid</span><span className="font-bold">{currency(receipt.amountPaid)}</span></div>
              </div>
            </div>
          </CardContent>

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

              <div className="hidden md:block w-px bg-muted-foreground/30" />

              <div className="md:flex-1 text-left md:text-right">
                <div>With Compliments,</div>
                <div className="mt-4">
                  <div className="font-semibold">For: R. K. NJOGU & CO. ADV.</div>
                  <div className="mt-4">
                    <div className="mb-6">{firmSignatory}</div>

                    {/* Placeholder signature box */}
                    <div className="inline-block border border-dashed border-gray-300 rounded-md px-6 py-4">
                      <div className="h-12 w-56 flex items-center justify-center text-xs text-muted-foreground">Signature</div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-3">{firmFooterText}</div>
                    <div className="mt-4 text-xs text-muted-foreground">{`Generated by ${firmNameTop}`}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
