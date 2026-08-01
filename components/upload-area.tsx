"use client";

import { useId, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format-file-size";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  onClear: () => void;
}

function CornerMarks({ active }: { active: boolean }) {
  const markClass = cn(
    "absolute size-4 border-current transition-colors",
    active ? "text-primary" : "text-border"
  );
  return (
    <>
      <span className={cn(markClass, "top-3 left-3 border-t-2 border-l-2")} aria-hidden />
      <span className={cn(markClass, "top-3 right-3 border-t-2 border-r-2")} aria-hidden />
      <span className={cn(markClass, "bottom-3 left-3 border-b-2 border-l-2")} aria-hidden />
      <span className={cn(markClass, "right-3 bottom-3 border-r-2 border-b-2")} aria-hidden />
    </>
  );
}

export function UploadArea({ selectedFile, onFileSelected, onClear }: UploadAreaProps) {
  const inputId = useId();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDraggingOver(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "relative flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border p-10 text-center transition-colors",
        isDraggingOver ? "border-primary/60 bg-primary/6" : "border-border bg-card/40"
      )}
    >
      <CornerMarks active={isDraggingOver || Boolean(selectedFile)} />

      {selectedFile ? (
        <>
          <FileText className="size-9 text-primary" aria-hidden />
          <div>
            <p className="font-medium break-all">{selectedFile.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
            Remove
          </button>
        </>
      ) : (
        <>
          <label htmlFor={inputId} className="absolute inset-0 cursor-pointer">
            <span className="sr-only">Upload document</span>
          </label>
          <UploadCloud
            className={cn(
              "size-9 transition-colors",
              isDraggingOver ? "text-primary" : "text-muted-foreground"
            )}
            aria-hidden
          />
          <div>
            <p className="font-medium">Drag and drop your document here</p>
            <p className="text-sm text-muted-foreground">or click to browse from your device</p>
          </div>
          <input
            id={inputId}
            type="file"
            accept={SUPPORTED_FILE_EXTENSIONS.join(",")}
            className="sr-only"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </>
      )}
    </div>
  );
}
