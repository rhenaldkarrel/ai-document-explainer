"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { ChatInput } from "@/components/chat-input";
import { ChatMessageList } from "@/components/chat-message-list";
import { SuggestedQuestions } from "@/components/suggested-questions";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useDocumentSession } from "@/lib/document-session-context";
import { useSettings } from "@/lib/settings-context";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { ApiErrorResponse, ChatStreamFrame } from "@/lib/types";

export function ChatPanel() {
  const {
    chatHistory,
    extractedText,
    suggestedQuestions,
    streamingMessage,
    addChatMessage,
    startStreamingMessage,
    appendToStreamingMessage,
    commitStreamingMessage,
    discardStreamingMessage,
  } = useDocumentSession();
  const { tier, temperature } = useSettings();
  const [error, setError] = useState<string | null>(null);

  const isSending = streamingMessage !== null;

  async function handleSend(question: string) {
    if (isSending || !extractedText) return;

    setError(null);
    const historyBeforeQuestion = chatHistory;
    addChatMessage({ role: "user", content: question });
    startStreamingMessage();

    try {
      let response: Response;
      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extractedText,
            history: historyBeforeQuestion,
            question,
            tier,
            temperature,
          }),
        });
      } catch {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }

      if (!response.ok || !response.body) {
        const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        throw new Error(errorBody?.error ?? ERROR_MESSAGES.PROCESSING_ERROR);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      function handleLine(line: string) {
        if (!line.trim()) return;
        const frame = JSON.parse(line) as ChatStreamFrame;
        if (frame.type === "text") {
          appendToStreamingMessage(frame.value);
        } else {
          throw new Error(frame.message);
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          handleLine(buffer.slice(0, newlineIndex));
          buffer = buffer.slice(newlineIndex + 1);
        }
      }
      handleLine(buffer);

      commitStreamingMessage();
    } catch (err) {
      discardStreamingMessage();
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.PROCESSING_ERROR);
    }
  }

  return (
    <section className="space-y-4 border-t pt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Ask a Question
      </h2>

      <ChatMessageList messages={chatHistory} streamingMessage={streamingMessage} />

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
