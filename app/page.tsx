"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { UploadArea } from "@/components/upload-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { validateFile } from "@/lib/validate-file";
import { uploadDocumentToBlob } from "@/lib/upload-client";
import { postJson } from "@/lib/fetch-with-error-mapping";
import { useDocumentSession } from "@/lib/document-session-context";
import { ERROR_MESSAGES, SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";
import type { AnalyzeApiResponse, SupportedMimeType } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { setAnalysisResult } = useDocumentSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mimeType, setMimeType] = useState<SupportedMimeType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function handleFileSelected(file: File) {
    const result = validateFile(file);
    if (!result.valid) {
      setSelectedFile(null);
      setMimeType(null);
      setError(result.error);
      return;
    }

    setSelectedFile(file);
    setMimeType(result.mimeType);
    setError(null);
  }

  function handleClear() {
    setSelectedFile(null);
    setMimeType(null);
    setError(null);
  }

  async function handleUpload() {
    if (!selectedFile || !mimeType || error || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      let blobUrl: string;
      try {
        blobUrl = (await uploadDocumentToBlob(selectedFile)).url;
      } catch {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }

      const data = await postJson<AnalyzeApiResponse>("/api/analyze", { blobUrl, mimeType });

      setAnalysisResult({
        fileName: selectedFile.name,
        analysis: data.analysis,
        extractedText: data.extractedText,
      });
      router.push("/analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.PROCESSING_ERROR);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <main className="flex w-full max-w-xl flex-col items-center gap-8">
        <div className="flex items-center gap-2">
          <FileText className="size-8 text-primary" aria-hidden />
          <span className="text-xl font-semibold tracking-tight">AI Document Explainer</span>
        </div>

        <p className="text-center text-muted-foreground">
          Upload a document and get an instant summary, key points, action items, and answers to
          your questions.
        </p>

        <div className="w-full space-y-4">
          <UploadArea
            selectedFile={selectedFile}
            onFileSelected={handleFileSelected}
            onClear={handleClear}
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Supported files:</span>
            {SUPPORTED_FILE_EXTENSIONS.map((extension) => (
              <Badge key={extension} variant="secondary">
                {extension.replace(".", "").toUpperCase()}
              </Badge>
            ))}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!selectedFile || !!error || isAnalyzing}
            onClick={handleUpload}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Analyzing document...
              </>
            ) : (
              "Analyze Document"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
