"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessageList } from "@/components/chat-message-list";
import { SuggestedQuestions } from "@/components/suggested-questions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useDocumentSession } from "@/lib/document-session-context";
import { postJson } from "@/lib/fetch-with-error-mapping";
import { useSettings } from "@/lib/settings-context";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { ChatApiResponse } from "@/lib/types";

export function ChatPanel() {
  const { chatHistory, extractedText, suggestedQuestions, addChatMessage } = useDocumentSession();
  const { tier, temperature } = useSettings();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(question: string) {
    if (isSending || !extractedText) return;

    setError(null);
    const historyBeforeQuestion = chatHistory;
    addChatMessage({ role: "user", content: question });
    setIsSending(true);

    try {
      const data = await postJson<ChatApiResponse>("/api/chat", {
        extractedText,
        history: historyBeforeQuestion,
        question,
        tier,
        temperature,
      });
      addChatMessage({ role: "model", content: data.answer });
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.PROCESSING_ERROR);
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

      {chatHistory.length === 0 && (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onSelect={handleSend}
          disabled={isSending}
        />
      )}

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
