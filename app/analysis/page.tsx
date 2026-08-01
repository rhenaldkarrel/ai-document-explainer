"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { DocumentPreview } from "@/components/document-preview";
import { SectionLabel } from "@/components/section-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDocumentSession } from "@/lib/document-session-context";
import { UI_STRINGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function revealDelay(index: number): React.CSSProperties {
  return { animationDelay: `${index * 0.08}s` };
}

export default function AnalysisPage() {
  const router = useRouter();
  const { fileName, analysis, previewUrl, previewMimeType, reset } = useDocumentSession();

  function handleStartOver() {
    reset();
    router.push("/");
  }

  if (!fileName || !analysis) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-muted-foreground">
          No document is loaded in this session.
        </p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Upload a document
        </Link>
      </div>
    );
  }

  // A running index across summary + key points + action items keeps the
  // highlight-reveal cascade continuous top-to-bottom, instead of each
  // section restarting its own stagger from zero.
  let revealIndex = 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="size-6 shrink-0 text-primary" aria-hidden />
          <h1 className="truncate font-heading text-xl font-medium tracking-tight">
            {fileName}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handleStartOver}
        >
          <RotateCcw aria-hidden />
          Start over
        </Button>
      </div>

      {previewUrl && previewMimeType && (
        <section className="space-y-3">
          <SectionLabel>Preview</SectionLabel>
          <DocumentPreview previewUrl={previewUrl} mimeType={previewMimeType} fileName={fileName} />
        </section>
      )}

      <section className="space-y-3">
        <SectionLabel>Summary</SectionLabel>
        <p className={cn("leading-relaxed")} style={revealDelay(revealIndex++)}>
          {analysis.summary}
        </p>
      </section>

      <section className="space-y-3">
        <SectionLabel>Key Points</SectionLabel>
        <ul className="space-y-2 pl-5">
          {analysis.keyPoints.map((point, index) => (
            <li
              key={index}
              className="highlight-reveal list-disc leading-relaxed marker:text-primary"
              style={revealDelay(revealIndex++)}
            >
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <SectionLabel>Action Items</SectionLabel>
        {analysis.actionItems.length > 0 ? (
          <ul className="space-y-2 pl-5">
            {analysis.actionItems.map((item, index) => (
              <li
                key={index}
                className="highlight-reveal list-disc leading-relaxed marker:text-primary"
                style={revealDelay(revealIndex++)}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{UI_STRINGS.NO_ACTION_ITEMS}</p>
        )}
      </section>

      <ChatPanel />
    </div>
  );
}
