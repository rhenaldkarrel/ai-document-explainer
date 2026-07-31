"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ChatMessage, DocumentAnalysis } from "@/lib/types";

interface DocumentSessionState {
  fileName: string | null;
  analysis: DocumentAnalysis | null;
  extractedText: string | null;
  suggestedQuestions: string[];
  chatHistory: ChatMessage[];
  /** In-progress streamed model reply, not yet in `chatHistory`. `null` = no answer streaming right now. */
  streamingMessage: string | null;
}

interface SetAnalysisResultInput {
  fileName: string;
  analysis: DocumentAnalysis;
  extractedText: string;
  suggestedQuestions: string[];
}

interface DocumentSessionContextValue extends DocumentSessionState {
  setAnalysisResult: (input: SetAnalysisResultInput) => void;
  addChatMessage: (message: ChatMessage) => void;
  startStreamingMessage: () => void;
  appendToStreamingMessage: (delta: string) => void;
  commitStreamingMessage: () => void;
  discardStreamingMessage: () => void;
  reset: () => void;
}

const initialState: DocumentSessionState = {
  fileName: null,
  analysis: null,
  extractedText: null,
  suggestedQuestions: [],
  chatHistory: [],
  streamingMessage: null,
};

const DocumentSessionContext = createContext<DocumentSessionContextValue | null>(null);

export function DocumentSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DocumentSessionState>(initialState);

  const setAnalysisResult = useCallback((input: SetAnalysisResultInput) => {
    setState({
      fileName: input.fileName,
      analysis: input.analysis,
      extractedText: input.extractedText,
      suggestedQuestions: input.suggestedQuestions,
      chatHistory: [],
      streamingMessage: null,
    });
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setState((previous) => ({
      ...previous,
      chatHistory: [...previous.chatHistory, message],
    }));
  }, []);

  const startStreamingMessage = useCallback(() => {
    setState((previous) => ({ ...previous, streamingMessage: "" }));
  }, []);

  const appendToStreamingMessage = useCallback((delta: string) => {
    setState((previous) => ({
      ...previous,
      streamingMessage: (previous.streamingMessage ?? "") + delta,
    }));
  }, []);

  const commitStreamingMessage = useCallback(() => {
    setState((previous) => {
      if (previous.streamingMessage === null) return previous;
      return {
        ...previous,
        chatHistory: [...previous.chatHistory, { role: "model", content: previous.streamingMessage }],
        streamingMessage: null,
      };
    });
  }, []);

  const discardStreamingMessage = useCallback(() => {
    setState((previous) => ({ ...previous, streamingMessage: null }));
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo<DocumentSessionContextValue>(
    () => ({
      ...state,
      setAnalysisResult,
      addChatMessage,
      startStreamingMessage,
      appendToStreamingMessage,
      commitStreamingMessage,
      discardStreamingMessage,
      reset,
    }),
    [
      state,
      setAnalysisResult,
      addChatMessage,
      startStreamingMessage,
      appendToStreamingMessage,
      commitStreamingMessage,
      discardStreamingMessage,
      reset,
    ]
  );

  return (
    <DocumentSessionContext.Provider value={value}>{children}</DocumentSessionContext.Provider>
  );
}

export function useDocumentSession(): DocumentSessionContextValue {
  const context = useContext(DocumentSessionContext);
  if (!context) {
    throw new Error("useDocumentSession must be used within a DocumentSessionProvider");
  }
  return context;
}
