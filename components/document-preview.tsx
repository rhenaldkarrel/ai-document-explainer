import { Download } from "lucide-react";
import { isOfficeMimeType } from "@/lib/constants";
import type { SupportedMimeType } from "@/lib/types";

interface DocumentPreviewProps {
  previewUrl: string;
  mimeType: SupportedMimeType;
  fileName: string;
}

export function DocumentPreview({ previewUrl, mimeType, fileName }: DocumentPreviewProps) {
  if (mimeType === "application/pdf") {
    return (
      <iframe
        src={previewUrl}
        title={`Preview of ${fileName}`}
        className="h-112 w-full rounded-lg border border-border bg-card"
      />
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      // A *fixed* height (not max-height) reserves this section's space on
      // the very first render, before the browser knows the image's
      // intrinsic dimensions — otherwise the container grows once the image
      // finishes loading, shifting everything below it (including the
      // suggested-question buttons) out from under an in-flight click.
      <div className="flex h-112 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-2">
        {/* next/image can't optimize a blob: URL (it's only valid in this browser tab) — a plain img is the correct tag here, not a shortcut. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={fileName}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (mimeType.startsWith("audio/")) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <audio controls src={previewUrl} className="w-full">
          <track kind="captions" />
        </audio>
      </div>
    );
  }

  if (isOfficeMimeType(mimeType)) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Inline preview isn&apos;t available for this file type.
        </p>
        <a
          href={previewUrl}
          download={fileName}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Download className="size-4" aria-hidden />
          Download to view
        </a>
      </div>
    );
  }

  return null;
}
