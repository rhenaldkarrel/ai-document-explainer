"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessageList } from "@/components/chat-message-list";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useDocumentSession } from "@/lib/document-session-context";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { ApiErrorResponse, ChatApiResponse } from "@/lib/types";

export function ChatPanel() {
  const { chatHistory, extractedText, addChatMessage } = useDocumentSession();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(question: string) {
    if (isSending || !extractedText) return;

    setError(null);
    const historyBeforeQuestion = chatHistory;
    addChatMessage({ role: "user", content: question });
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedText,
          history: historyBeforeQuestion,
          question,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        setError(errorBody?.error ?? ERROR_MESSAGES.PROCESSING_ERROR);
        return;
      }

      const data = (await response.json()) as ChatApiResponse;
      addChatMessage({ role: "model", content: data.answer });
    } catch {
      setError(ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="space-y-4 border-t pt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Ask a Question
      </h2>

      <ChatMessageList messages={chatHistory} isSending={isSending} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <ChatInput onSend={handleSend} disabled={isSending} />
    </section>
  );
}
