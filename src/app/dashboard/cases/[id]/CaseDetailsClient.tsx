// app/dashboard/cases/[id]/CaseDetailsClient.tsx
"use client";

import { useFirestore, useDoc, useCollection } from "@/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Link as LinkIcon,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { type Client } from "../../clients/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = { id: string };

const getStatusVariant = (status: string) => {
  switch (status) {
    case "Open":
      return "default";
    case "In Progress":
      return "secondary";
    case "On Hold":
      return "outline";
    case "Closed":
      return "destructive";
    default:
      return "default";
  }
};

type CaseData = {
  id: string;
  caseName: string;
  caseDescription?: string;
  clientId: string;
  status: "Open" | "In Progress" | "Closed" | "On Hold";
  filingDate?: string | null;
  assignedPersonnelIds: string[];

  // additional optional fields we now support
  closedOutcome?: string | null;
  closedNotes?: string | null;
  closedAt?: any | null;
  holdReason?: string | null;
  onHoldSince?: any | null;
  progressStage?: string | null;
  progressNotes?: string | null;
};

type UserProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type DocumentData = {
  id: string;
  fileName: string;
  fileUrl?: string;
  uploadDate?: string | null; // older uploads
  scannedAt?: string | null; // new "scan" timestamp we use
  createdAt?: string | null; // any other timestamp variants
  fileType?: string;
  fileSize?: number | null;
  extractedText?: string | null;
  thumbnailUrl?: string | null;
};

export default function CaseDetailsClient({ id }: Props) {
  const firestore = useFirestore();

  // Primary doc ref & hook
  const caseRef = useMemo(
    () => (firestore && id ? doc(firestore, "cases", id) : null),
    [firestore, id]
  );
  const { data: singleCaseFromHook, isLoading: isCaseLoading } =
    useDoc<CaseData>(caseRef);

  // Local fallback state (from manual getDoc)
  const [fallbackCase, setFallbackCase] = useState<
    CaseData | null | undefined
  >(undefined); // undefined = not fetched yet
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !id) {
      setFallbackCase(null);
      return;
    }
    if (singleCaseFromHook) {
      setFallbackCase(singleCaseFromHook);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        console.debug(
          "[CaseDetails] useDoc returned null — attempting manual getDoc fallback for id:",
          id
        );
        const snap = await getDoc(doc(firestore, "cases", id));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as any;
          const caseData: CaseData = {
            id: snap.id,
            caseName: data.caseName || data.title || "Untitled Case",
            caseDescription: data.caseDescription || data.description || "",
            clientId: data.clientId || data.client?.id || "",
            status: data.status || "Open",
            filingDate: data.filingDate || data.createdAt || null,
            assignedPersonnelIds: data.assignedPersonnelIds || [],
            closedOutcome: data.closedOutcome ?? null,
            closedNotes: data.closedNotes ?? null,
            closedAt: data.closedAt ?? null,
            holdReason: data.holdReason ?? null,
            onHoldSince: data.onHoldSince ?? null,
            progressStage: data.progressStage ?? null,
            progressNotes: data.progressNotes ?? null,
          };
          console.info("[CaseDetails] Manual getDoc found case:", snap.id);
          setFallbackCase(caseData);
        } else {
          console.warn(
            "[CaseDetails] Manual getDoc: case does NOT exist for id:",
            id
          );
          setFallbackCase(null);
        }
      } catch (err: any) {
        console.error("[CaseDetails] getDoc fallback error:", err);
        setFallbackError(err?.message || String(err));
        setFallbackCase(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [firestore, id, singleCaseFromHook]);

  // Choose the case object (prefer hook, then fallback)
  const singleCase =
    singleCaseFromHook ?? (fallbackCase === undefined ? null : fallbackCase);

  // local status + update state for optimistic UI
  // keep localStatus strictly typed to CaseData["status"]
  const [localStatus, setLocalStatus] = useState<CaseData["status"]>(
    (singleCase?.status ?? "Open") as CaseData["status"]
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // fields for closed / on-hold / in-progress details (local state until user saves)
  const [closedOutcome, setClosedOutcome] = useState<string | null>(null);
  const [closedNotes, setClosedNotes] = useState<string | null>(null);

  const [holdReason, setHoldReason] = useState<string | null>(null);

  const [progressStage, setProgressStage] = useState<string | null>(null);
  const [progressNotes, setProgressNotes] = useState<string | null>(null);

  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // ensure local fields sync when singleCase changes (e.g., real-time updates)
  useEffect(() => {
    if (!singleCase) return;
    setLocalStatus(singleCase.status);
    setStatusError(null);

    setClosedOutcome(singleCase.closedOutcome ?? null);
    setClosedNotes(singleCase.closedNotes ?? null);

    setHoldReason(singleCase.holdReason ?? null);

    setProgressStage(singleCase.progressStage ?? null);
    setProgressNotes(singleCase.progressNotes ?? null);
  }, [
    singleCase?.status,
    singleCase?.closedOutcome,
    singleCase?.closedNotes,
    singleCase?.holdReason,
    singleCase?.progressStage,
    singleCase?.progressNotes,
  ]);

  // Fetch client and assigned lawyer based on whichever case we have (hook or fallback)
  const clientRef = useMemo(
    () =>
      firestore && singleCase?.clientId
        ? doc(firestore, "clients", singleCase.clientId)
        : null,
    [firestore, singleCase]
  );
  const { data: client, isLoading: isClientLoading } = useDoc<Client>(clientRef);

  const lawyerRef = useMemo(
    () =>
      firestore && singleCase?.assignedPersonnelIds?.[0]
        ? doc(firestore, "users", singleCase.assignedPersonnelIds[0])
        : null,
    [firestore, singleCase]
  );
  const { data: lawyer, isLoading: isLawyerLoading } =
    useDoc<UserProfile>(lawyerRef);

  // Documents subcollection
  const documentsQuery = useMemo(
    () =>
      firestore && id ? query(collection(firestore, `cases/${id}/documents`)) : null,
    [firestore, id]
  );
  const { data: documents, isLoading: isDocumentsLoading } =
    useCollection<DocumentData>(documentsQuery);

  const isLoading =
    isCaseLoading ||
    isClientLoading ||
    isLawyerLoading ||
    isDocumentsLoading ||
    fallbackCase === undefined;

  // Update handler: optimistic UI + Firestore update for status ONLY (no extra details)
  async function handleStatusChange(nextStatus: CaseData["status"]) {
    if (!caseRef || !firestore) {
      setStatusError("Unable to update status: Firestore not available.");
      return;
    }
    if (nextStatus === localStatus) return;

    // optimistic update
    const previousStatus: CaseData["status"] = localStatus;
    setLocalStatus(nextStatus);
    setStatusError(null);
    setIsUpdatingStatus(true);

    try {
      // We persist the status immediately. Additional details are saved when user clicks "Save details".
      await updateDoc(caseRef, { status: nextStatus });

      setFallbackCase((prev) =>
        prev ? { ...prev, status: nextStatus } : prev
      );
      setIsUpdatingStatus(false);
    } catch (err: any) {
      console.error("[CaseDetails] Error updating status:", err);
      // revert optimistic update on error
      setLocalStatus(previousStatus);
      setFallbackCase((prev) =>
        prev ? { ...prev, status: previousStatus } : prev
      );
      setStatusError(err?.message ? String(err.message) : "Failed to update status.");
      setIsUpdatingStatus(false);
    }
  }

  // Save details for the current status (Closed / On Hold / In Progress). Writes fields + timestamps.
  async function handleSaveDetails() {
    if (!caseRef || !firestore) {
      setDetailsError("Unable to save details: Firestore not available.");
      return;
    }

    setDetailsError(null);

    const payload: Record<string, any> = { status: localStatus };

    // basic validation
    if (localStatus === "Closed") {
      if (!closedOutcome || closedOutcome.trim() === "") {
        setDetailsError("Please choose an outcome when closing a case.");
        return;
      }
      payload.closedOutcome = closedOutcome;
      payload.closedNotes = closedNotes ?? null;
      payload.closedAt = serverTimestamp();
      // clear on-hold & in-progress metadata (optional, but keeps model tidy)
      payload.holdReason = null;
      payload.onHoldSince = null;
      payload.progressStage = null;
      payload.progressNotes = null;
    } else if (localStatus === "On Hold") {
      if (!holdReason || holdReason.trim() === "") {
        setDetailsError("Please provide a reason for placing the case on hold.");
        return;
      }
      payload.holdReason = holdReason;
      payload.onHoldSince = serverTimestamp();
      // clear closed metadata if any
      payload.closedOutcome = null;
      payload.closedNotes = null;
      payload.closedAt = null;
    } else if (localStatus === "In Progress") {
      if (!progressStage || progressStage.trim() === "") {
        setDetailsError("Please select the current stage for 'In Progress'.");
        return;
      }
      payload.progressStage = progressStage;
      payload.progressNotes = progressNotes ?? null;
      // clear closed / on-hold metadata
      payload.closedOutcome = null;
      payload.closedNotes = null;
      payload.closedAt = null;
      payload.holdReason = null;
      payload.onHoldSince = null;
    } else if (localStatus === "Open") {
      // clearing metadata when reopening
      payload.closedOutcome = null;
      payload.closedNotes = null;
      payload.closedAt = null;
      payload.holdReason = null;
      payload.onHoldSince = null;
      payload.progressStage = null;
      payload.progressNotes = null;
    }

    setIsSavingDetails(true);
    try {
      await updateDoc(caseRef, payload);
      // optimistic fallbackCase update
      setFallbackCase((prev) =>
        prev
          ? {
              ...prev,
              status: localStatus,
              closedOutcome: payload.closedOutcome ?? null,
              closedNotes: payload.closedNotes ?? null,
              closedAt: payload.closedAt ?? prev.closedAt,
              holdReason: payload.holdReason ?? null,
              onHoldSince: payload.onHoldSince ?? prev.onHoldSince,
              progressStage: payload.progressStage ?? null,
              progressNotes: payload.progressNotes ?? null,
            }
          : prev
      );
      setIsSavingDetails(false);
      setDetailsError(null);
    } catch (err: any) {
      console.error("[CaseDetails] Error saving details:", err);
      setDetailsError(err?.message ? String(err.message) : "Failed to save details.");
      setIsSavingDetails(false);
    }
  }

  function handleCancelDetails() {
    // revert local inputs to the backing singleCase values
    if (!singleCase) return;
    setClosedOutcome(singleCase.closedOutcome ?? null);
    setClosedNotes(singleCase.closedNotes ?? null);
    setHoldReason(singleCase.holdReason ?? null);
    setProgressStage(singleCase.progressStage ?? null);
    setProgressNotes(singleCase.progressNotes ?? null);
    setDetailsError(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!singleCase) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Case not found</CardTitle>
            <CardDescription>
              We couldn't locate a case with ID{" "}
              <code className="break-all">{id}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This could be because the case was deleted, the ID is incorrect,
              or your account doesn't have permission to view it.
            </p>

            {fallbackError && (
              <div className="rounded bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Error:</strong> {fallbackError}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Link href="/dashboard/cases">
                <Button variant="outline">Back to Cases</Button>
              </Link>
              <Button asChild>
                <a
                  href={`https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/~2Fcases~2F${encodeURIComponent(
                    id
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Firebase Console
                </a>
              </Button>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Debug: check Firestore collection <code>cases</code> for the above
              ID and verify rules.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientName = client
    ? client.name || `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()
    : "Loading...";

  const lawyerName = lawyer
    ? `${lawyer.firstName ?? ""} ${lawyer.lastName ?? ""}`.trim() || "Unassigned"
    : "Unassigned";

  // Safe date formatting helper
  function formatDateSafe(dateMaybe?: string | null) {
    if (!dateMaybe) return "Unknown";
    const d = new Date(dateMaybe);
    if (Number.isNaN(d.getTime())) return "Unknown";
    try {
      return format(d, "PPP");
    } catch {
      return d.toLocaleString();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard/cases">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to cases</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline">Case Details</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>{singleCase.caseName}</CardTitle>
              <CardDescription>Case ID: {singleCase.id}</CardDescription>
            </div>

            {/* Status controls: Badge + select dropdown + conditional details area */}
            <div className="flex flex-col items-end gap-2 max-w-md">
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(localStatus || singleCase.status)}>
                  {localStatus || singleCase.status}
                </Badge>

                <div className="relative w-[220px]">
                  <label htmlFor="case-status-select" className="sr-only">
                    Change case status
                  </label>
                  <select
                    id="case-status-select"
                    value={localStatus}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as CaseData["status"])
                    }
                    disabled={isUpdatingStatus || isSavingDetails}
                    className="block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-describedby="status-help"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed">Closed</option>
                  </select>

                  {isUpdatingStatus && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 w-full">
                <p id="status-help" className="text-xs text-muted-foreground">
                  Change status — saves immediately. Use "Save details" below to
                  attach outcome, reason, or stage.
                </p>
                {statusError && (
                  <div className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    {statusError}
                  </div>
                )}
              </div>

              {/* Conditional details panel */}
              <div className="w-full mt-2">
                {localStatus === "Closed" && (
                  <div className="rounded-md border p-3 bg-muted/5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Closed details</div>
                      <div className="text-xs text-muted-foreground">saved to Database on Save</div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <label className="text-xs text-muted-foreground">Outcome</label>
                      <select
                        value={closedOutcome ?? ""}
                        onChange={(e) => setClosedOutcome(e.target.value ?? null)}
                        className="rounded-md border px-2 py-2 text-sm"
                      >
                        <option value="">Select outcome…</option>
                        <option value="Win">Win</option>
                        <option value="Loss">Loss</option>
                        <option value="Settled">Settled</option>
                        <option value="Dismissed">Dismissed</option>
                        <option value="Other">Other</option>
                      </select>

                      <label className="text-xs text-muted-foreground">Notes (optional)</label>
                      <textarea
                        rows={3}
                        value={closedNotes ?? ""}
                        onChange={(e) => setClosedNotes(e.target.value ?? null)}
                        className="rounded-md border p-2 text-sm"
                        placeholder="Add context — e.g., settlement amount, court judgment, etc."
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDetails}
                          disabled={isSavingDetails}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveDetails}
                          disabled={isSavingDetails}
                        >
                          {isSavingDetails ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                            </>
                          ) : (
                            "Save details"
                          )}
                        </Button>
                      </div>
                      {detailsError && (
                        <div className="text-sm text-destructive">{detailsError}</div>
                      )}
                    </div>
                  </div>
                )}

                {localStatus === "On Hold" && (
                  <div className="rounded-md border p-3 bg-muted/5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">On hold details</div>
                      <div className="text-xs text-muted-foreground">provide a reason</div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <label className="text-xs text-muted-foreground">Reason</label>
                      <textarea
                        rows={3}
                        value={holdReason ?? ""}
                        onChange={(e) => setHoldReason(e.target.value ?? null)}
                        className="rounded-md border p-2 text-sm"
                        placeholder="Why is the case on hold? (client unavailable, awaiting docs, etc.)"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDetails}
                          disabled={isSavingDetails}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveDetails} disabled={isSavingDetails}>
                          {isSavingDetails ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                            </>
                          ) : (
                            "Save details"
                          )}
                        </Button>
                      </div>
                      {detailsError && (
                        <div className="text-sm text-destructive">{detailsError}</div>
                      )}
                    </div>
                  </div>
                )}

                {localStatus === "In Progress" && (
                  <div className="rounded-md border p-3 bg-muted/5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Progress details</div>
                      <div className="text-xs text-muted-foreground">track current stage</div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <label className="text-xs text-muted-foreground">Stage</label>
                      <select
                        value={progressStage ?? ""}
                        onChange={(e) => setProgressStage(e.target.value ?? null)}
                        className="rounded-md border px-2 py-2 text-sm"
                      >
                        <option value="">Select stage…</option>
                        <option value="Investigation">Investigation</option>
                        <option value="Filing">Filing</option>
                        <option value="Discovery">Discovery</option>
                        <option value="Trial">Trial</option>
                        <option value="Appeal">Appeal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Other">Other</option>
                      </select>

                      <label className="text-xs text-muted-foreground">Notes (optional)</label>
                      <textarea
                        rows={3}
                        value={progressNotes ?? ""}
                        onChange={(e) => setProgressNotes(e.target.value ?? null)}
                        className="rounded-md border p-2 text-sm"
                        placeholder="Optional notes about the current stage — next steps, blockers, deadlines..."
                      />

                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDetails}
                          disabled={isSavingDetails}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveDetails} disabled={isSavingDetails}>
                          {isSavingDetails ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                            </>
                          ) : (
                            "Save details"
                          )}
                        </Button>
                      </div>

                      {detailsError && (
                        <div className="text-sm text-destructive">{detailsError}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="grid gap-1">
                <p className="text-sm font-medium text-muted-foreground">Client</p>
                <p>{clientName}</p>
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Assigned Lawyer
                </p>
                <p>{lawyerName}</p>
              </div>
              <div className="grid gap-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Filing Date
                </p>
                <p>{formatDateSafe(singleCase.filingDate ?? null)}</p>
              </div>
            </div>

            {singleCase.caseDescription && (
              <div className="grid gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Case Description
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {singleCase.caseDescription}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Documents</CardTitle>
          <CardDescription>Associated documents and files for this case.</CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Type / Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      formatDateSafe={formatDateSafe}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4 bg-secondary rounded-md">
              No documents have been added to this case yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Subcomponent for each document row with toggle to show extracted text + preview */
function DocumentRow({
  doc,
  formatDateSafe,
}: {
  doc: DocumentData;
  formatDateSafe: (s?: string | null) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  // prefer uploadDate, then scannedAt, then createdAt
  const rawDate = doc.uploadDate ?? doc.scannedAt ?? doc.createdAt ?? null;
  const dateLabel = formatDateSafe(rawDate);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium flex items-center gap-2">
          {doc.thumbnailUrl ? (
            // small preview icon (image)
            <img
              src={doc.thumbnailUrl}
              alt={doc.fileName}
              className="h-8 w-8 rounded object-cover"
            />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <div className="font-medium">{doc.fileName}</div>
            {doc.extractedText ? (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {doc.extractedText}
              </div>
            ) : null}
          </div>
        </TableCell>
        <TableCell>{dateLabel}</TableCell>
        <TableCell>
          <div className="text-sm">
            {doc.fileType ?? "—"}{" "}
            {doc.fileSize ? `• ${Math.round((doc.fileSize || 0) / 1024)} KB` : ""}
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {doc.fileUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                  <LinkIcon className="mr-2 h-4 w-4" /> View
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <LinkIcon className="mr-2 h-4 w-4" /> No file
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded((s) => !s)}>
              <ChevronDown className="mr-2 h-4 w-4" />
              {expanded ? "Hide" : "Show"} Details
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={4}>
            <div className="grid md:grid-cols-3 gap-4 p-4 bg-muted/5 rounded">
              <div className="md:col-span-1">
                {doc.thumbnailUrl ? (
                  <img
                    src={doc.thumbnailUrl}
                    alt={doc.fileName}
                    className="max-h-48 object-contain rounded"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                    No preview available
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <div className="text-sm">
                  <strong>File name:</strong> {doc.fileName}
                </div>
                <div className="text-sm mt-2">
                  <strong>File type:</strong> {doc.fileType ?? "—"}
                </div>
                <div className="text-sm mt-2 whitespace-pre-wrap">
                  <strong>Extracted text:</strong>
                  <div className="mt-1 rounded border p-2 bg-white text-xs">
                    {doc.extractedText ? doc.extractedText : <em>No text extracted for this file.</em>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  <strong>Date added:</strong> {dateLabel}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
