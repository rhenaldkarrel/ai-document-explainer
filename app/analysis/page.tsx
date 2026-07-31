"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { buttonVariants } from "@/components/ui/button";
import { useDocumentSession } from "@/lib/document-session-context";
import { UI_STRINGS } from "@/lib/constants";

export default function AnalysisPage() {
  const { fileName, analysis } = useDocumentSession();

  if (!fileName || !analysis) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-muted-foreground">No document is loaded in this session.</p>
        <Link href="/" className={buttonVariants({ variant: "default" })}>
          Upload a document
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="flex items-center gap-2">
        <FileText className="size-6 text-primary" aria-hidden />
        <h1 className="break-all text-lg font-semibold">{fileName}</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Executive Summary
        </h2>
        <p>{analysis.summary}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Key Points
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          {analysis.keyPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Action Items
        </h2>
        {analysis.actionItems.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {analysis.actionItems.map((item, index) => (
              <li key={index}>{item}</li>
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
