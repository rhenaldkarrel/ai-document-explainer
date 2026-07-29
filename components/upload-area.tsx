"use client";

import { useId, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  selectedFile: File | null;
  onFileSelected: (file: File) => void;
  onClear: () => void;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
        "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
        isDraggingOver ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {selectedFile ? (
        <>
          <FileText className="size-10 text-primary" aria-hidden />
          <div>
            <p className="font-medium break-all">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
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
          <UploadCloud className="size-10 text-muted-foreground" aria-hidden />
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
