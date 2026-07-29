"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { UploadArea } from "@/components/upload-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { validateFile } from "@/lib/validate-file";
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  function handleFileSelected(file: File) {
    setIsReady(false);

    const result = validateFile(file);
    if (!result.valid) {
      setSelectedFile(null);
      setError(result.error);
      return;
    }

    setSelectedFile(file);
    setError(null);
  }

  function handleClear() {
    setSelectedFile(null);
    setError(null);
    setIsReady(false);
  }

  function handleUpload() {
    if (!selectedFile || error) return;
    setIsReady(true);
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

          {isReady && !error && selectedFile && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Ready to analyze &ldquo;{selectedFile.name}&rdquo;</AlertTitle>
              <AlertDescription>
                Document analysis will be wired up in the next phase.
              </AlertDescription>
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
            disabled={!selectedFile || !!error}
            onClick={handleUpload}
          >
            Analyze Document
          </Button>
        </div>
      </main>
    </div>
  );
}
