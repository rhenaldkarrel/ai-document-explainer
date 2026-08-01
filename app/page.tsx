"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { CostHint } from "@/components/cost-hint";
import { UploadArea } from "@/components/upload-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { validateFile } from "@/lib/validate-file";
import { uploadDocumentToBlob } from "@/lib/upload-client";
import { ApiRequestError, postJson } from "@/lib/fetch-with-error-mapping";
import { useDocumentSession } from "@/lib/document-session-context";
import { useSettings } from "@/lib/settings-context";
import { ERROR_MESSAGES, SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";
import type { AnalyzeApiResponse, SupportedMimeType } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { setAnalysisResult } = useDocumentSession();
  const { tier, temperature } = useSettings();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mimeType, setMimeType] = useState<SupportedMimeType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [retryBlobUrl, setRetryBlobUrl] = useState<string | null>(null);

  function handleFileSelected(file: File) {
    const result = validateFile(file);
    if (!result.valid) {
      setSelectedFile(null);
      setMimeType(null);
      setError(result.error);
      setRetryBlobUrl(null);
      return;
    }

    setSelectedFile(file);
    setMimeType(result.mimeType);
    setError(null);
    setRetryBlobUrl(null);
  }

  function handleClear() {
    setSelectedFile(null);
    setMimeType(null);
    setError(null);
    setRetryBlobUrl(null);
  }

  async function runAnalysis(
    blobUrl: string,
    currentMimeType: SupportedMimeType,
    file: File,
  ) {
    try {
      const data = await postJson<AnalyzeApiResponse>("/api/analyze", {
        blobUrl,
        mimeType: currentMimeType,
        tier,
        temperature,
      });

      setAnalysisResult({
        fileName: file.name,
        analysis: data.analysis,
        extractedText: data.extractedText,
        suggestedQuestions: data.suggestedQuestions,
        previewUrl: URL.createObjectURL(file),
        previewMimeType: currentMimeType,
      });
      router.push("/analysis");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : ERROR_MESSAGES.PROCESSING_ERROR;
      setError(message);
      setRetryBlobUrl(
        err instanceof ApiRequestError && err.retryable ? blobUrl : null,
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile || !mimeType || error || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    setRetryBlobUrl(null);

    let blobUrl: string;
    try {
      blobUrl = (await uploadDocumentToBlob(selectedFile)).url;
    } catch {
      setError(ERROR_MESSAGES.NETWORK_ERROR);
      setIsAnalyzing(false);
      return;
    }

    await runAnalysis(blobUrl, mimeType, selectedFile);
  }

  function handleRetry() {
    if (!retryBlobUrl || !mimeType || !selectedFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    void runAnalysis(retryBlobUrl, mimeType, selectedFile);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <main className="flex w-full max-w-xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">
            AI Document Explainer
          </span>
          <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight text-balance sm:text-4xl">
            Understand any document in{" "}
            <span className="text-primary italic">under a minute</span>
          </h1>
          <p className="max-w-md text-muted-foreground">
            Upload a document and get an instant summary, key points, action
            items, and answers to your questions.
          </p>
        </div>

        <div className="w-full space-y-4">
          <UploadArea
            selectedFile={selectedFile}
            onFileSelected={handleFileSelected}
            onClear={handleClear}
          />

          {selectedFile && !error && (
            <CostHint fileSizeBytes={selectedFile.size} />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{error}</AlertTitle>
              {retryBlobUrl && (
                <AlertAction>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={isAnalyzing}
                  >
                    <RotateCcw aria-hidden />
                    Retry
                  </Button>
                </AlertAction>
              )}
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-sm text-muted-foreground">
              Supported files:
            </span>
            {SUPPORTED_FILE_EXTENSIONS.map((extension) => (
              <Badge key={extension} variant="outline" className="font-mono">
                {extension.replace(".", "").toUpperCase()}
              </Badge>
            ))}
          </div>

          <Button
            className="w-full cursor-pointer"
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
