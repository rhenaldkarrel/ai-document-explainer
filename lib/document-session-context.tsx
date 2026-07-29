"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ChatMessage, DocumentAnalysis } from "@/lib/types";

interface DocumentSessionState {
  fileName: string | null;
  analysis: DocumentAnalysis | null;
  extractedText: string | null;
  chatHistory: ChatMessage[];
}

interface SetAnalysisResultInput {
  fileName: string;
  analysis: DocumentAnalysis;
  extractedText: string;
}

interface DocumentSessionContextValue extends DocumentSessionState {
  setAnalysisResult: (input: SetAnalysisResultInput) => void;
  addChatMessage: (message: ChatMessage) => void;
  reset: () => void;
}

const initialState: DocumentSessionState = {
  fileName: null,
  analysis: null,
  extractedText: null,
  chatHistory: [],
};

const DocumentSessionContext = createContext<DocumentSessionContextValue | null>(null);

export function DocumentSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DocumentSessionState>(initialState);

  const setAnalysisResult = useCallback((input: SetAnalysisResultInput) => {
    setState({
      fileName: input.fileName,
      analysis: input.analysis,
      extractedText: input.extractedText,
      chatHistory: [],
    });
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setState((previous) => ({
      ...previous,
      chatHistory: [...previous.chatHistory, message],
    }));
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo<DocumentSessionContextValue>(
    () => ({ ...state, setAnalysisResult, addChatMessage, reset }),
    [state, setAnalysisResult, addChatMessage, reset]
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
