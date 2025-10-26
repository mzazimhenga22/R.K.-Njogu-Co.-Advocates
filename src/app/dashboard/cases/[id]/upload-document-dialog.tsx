"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { UploadCloud } from "lucide-react";

import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

/**
 * NOTE:
 * - This component DOES NOT upload the original file to Firebase Storage.
 * - It extracts text and saves file metadata + extractedText to Firestore.
 * - If you previously got storage/no-default-bucket it came from calling Firebase Storage APIs.
 */

type Props = {
  caseId: string;
  caseName?: string;
};

export default function UploadDocumentDialog({ caseId, caseName }: Props) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progressText, setProgressText] = React.useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = React.useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  // ensure pdfjs worker path (CDN). Using the legacy build, and cast to any to avoid TS complaints
  // If you host a local copy, change the URL accordingly.
  // @ts-ignore
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjsLib as any).version}/pdf.worker.min.js`;

  async function extractTextFromPDF(fileBlob: Blob): Promise<string> {
    try {
      setProgressText("Reading PDF...");
      const arrayBuffer = await fileBlob.arrayBuffer();
      setProgressText("Parsing PDF...");
      const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      let fullText = "";
      for (let p = 1; p <= totalPages; p++) {
        setProgressText(`Extracting text from page ${p} / ${totalPages}...`);
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `\n\n--- page ${p} ---\n` + pageText;
      }
      return fullText.trim();
    } catch (err) {
      console.warn("PDF extraction failed:", err);
      return "";
    } finally {
      setProgressText(null);
    }
  }

  async function extractTextFromImage(fileBlob: Blob, onProgress?: (pct: number) => void): Promise<string> {
    try {
      setProgressText("Running OCR (this may take a while)...");
      const result = await Tesseract.recognize(fileBlob, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number" && onProgress) {
            onProgress(Math.round(m.progress * 100));
            setProgressText(`OCR ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      return result?.data?.text || "";
    } catch (err) {
      console.warn("Image OCR failed:", err);
      return "";
    } finally {
      setProgressText(null);
    }
  }

  async function makeImageThumbnailBase64(fileBlob: Blob, maxDim = 400): Promise<string | null> {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(fileBlob);
      });

      // create image and draw to canvas with scaled size
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = (e) => reject(e);
        image.src = dataUrl;
      });

      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      // export small JPEG to keep size down
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.warn("Thumbnail generation failed:", err);
      return null;
    }
  }

  async function handleScanAndSave() {
    if (!file) {
      toast({ variant: "destructive", title: "No file selected", description: "Please choose a file to scan." });
      return;
    }
    if (!firestore) {
      toast({ variant: "destructive", title: "Firestore not initialized" });
      return;
    }

    setIsProcessing(true);
    setExtractedPreview(null);
    setProgressText("Starting extraction...");

    try {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
      const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|bmp|gif|webp)$/i.test(lowerName);

      let extractedText = "";
      let thumbnailBase64: string | null = null;

      if (isPdf) {
        extractedText = await extractTextFromPDF(file);
      } else if (isImage) {
        // small progress handler for OCR
        extractedText = await extractTextFromImage(file, (pct) => {
          setProgressText(`OCR ${pct}%`);
        });
        // create small thumbnail (optional; helps clients preview without Storage)
        thumbnailBase64 = await makeImageThumbnailBase64(file, 400);
      } else {
        // For other file types we don't attempt OCR — just record metadata
        extractedText = "";
      }

      // trim and limit preview length stored in preview variable (UI)
      const preview = extractedText ? extractedText.slice(0, 5000) : null;
      setExtractedPreview(preview);

      // Save only metadata + extractedText to Firestore; no Storage used.
      const documentsCollectionRef = collection(firestore, `cases/${caseId}/documents`);
      await addDoc(documentsCollectionRef, {
        fileName: file.name,
        fileType: file.type || null,
        fileSize: file.size || null,
        extractedText: extractedText || null,
        thumbnailBase64: thumbnailBase64 || null, // small image preview (nullable)
        scannedAt: new Date().toISOString(),
        uploadedToStorage: false, // indicates original file was not uploaded to Storage
      });

      toast({
        title: "Scan saved",
        description: `${file.name} scanned and extracted text saved to case.`,
      });

      // clear UI
      setFile(null);
      setOpen(false);
    } catch (err: any) {
      console.error("Scan & save error:", err);
      toast({
        variant: "destructive",
        title: "Scan error",
        description: String(err?.message || err),
      });
    } finally {
      setProgressText(null);
      setIsProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setExtractedPreview(null); setProgressText(null);} }}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <UploadCloud className="mr-2 h-4 w-4" /> Upload / Scan Document
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan & Save Document Info</DialogTitle>
          <DialogDescription>
            Select a PDF or image to scan. The app will extract text and save the scanned data to the case (no file upload).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select file to scan</label>
            <Input
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setExtractedPreview(null);
              }}
            />
          </div>

          {file && (
            <div className="text-sm text-muted-foreground">
              <div><strong>Name:</strong> {file.name}</div>
              <div><strong>Type:</strong> {file.type || "unknown"}</div>
              <div><strong>Size:</strong> {Math.round((file.size || 0) / 1024)} KB</div>
            </div>
          )}

          {progressText && (
            <div className="text-sm">
              {progressText}
            </div>
          )}

          {extractedPreview && (
            <div className="border rounded p-2 bg-white text-xs max-h-48 overflow-auto">
              <strong>Preview (first 5000 chars):</strong>
              <pre className="whitespace-pre-wrap text-xs">{extractedPreview}</pre>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); setFile(null); }} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleScanAndSave} disabled={!file || isProcessing}>
              {isProcessing ? "Scanning..." : "Scan & Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
