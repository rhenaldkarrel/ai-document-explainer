"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { ChatMessage, DocumentAnalysis } from "@/lib/types";

const STORAGE_KEY = "ai-document-explainer:session:v1";

interface DocumentSessionState {
  fileName: string | null;
  analysis: DocumentAnalysis | null;
  extractedText: string | null;
  suggestedQuestions: string[];
  chatHistory: ChatMessage[];
  /** In-progress streamed model reply, not yet in `chatHistory`. `null` = no answer streaming right now. Never persisted. */
  streamingMessage: string | null;
}

interface SetAnalysisResultInput {
  fileName: string;
  analysis: DocumentAnalysis;
  extractedText: string;
  suggestedQuestions: string[];
}

const initialState: DocumentSessionState = {
  fileName: null,
  analysis: null,
  extractedText: null,
  suggestedQuestions: [],
  chatHistory: [],
  streamingMessage: null,
};

/** Structural check only — a corrupt/foreign value falls back to `initialState` rather than crashing the app. */
function isPersistedShape(value: unknown): value is Omit<DocumentSessionState, "streamingMessage"> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.fileName === null || typeof v.fileName === "string") &&
    Array.isArray(v.chatHistory) &&
    Array.isArray(v.suggestedQuestions)
  );
}

function readStoredSession(): DocumentSessionState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;

    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedShape(parsed)) return initialState;

    return { ...initialState, ...parsed, streamingMessage: null };
  } catch {
    return initialState;
  }
}

// A single module-level store, mirroring lib/settings-context.tsx: this is a
// client-only, app-wide singleton, so there's only ever one to synchronize
// via useSyncExternalStore.
let cachedState: DocumentSessionState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): DocumentSessionState {
  if (cachedState === null) {
    cachedState = readStoredSession();
  }
  return cachedState;
}

// Returns the same defaults the server rendered, so the hydration pass
// matches — useSyncExternalStore then swaps to the real client value and
// re-renders, instead of writing state from inside an effect.
function getServerSnapshot(): DocumentSessionState {
  return initialState;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function persist(state: DocumentSessionState): void {
  try {
    const persisted: Omit<DocumentSessionState, "streamingMessage"> = {
      fileName: state.fileName,
      analysis: state.analysis,
      extractedText: state.extractedText,
      suggestedQuestions: state.suggestedQuestions,
      chatHistory: state.chatHistory,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage unavailable (e.g. Safari private mode) — state stays in-memory for this session.
  }
}

/**
 * `shouldPersist: false` is for the streaming mutators, which fire once per
 * token — writing to localStorage on every chunk would be pure waste, since
 * `streamingMessage` is excluded from what gets persisted anyway.
 */
function setState(
  next: DocumentSessionState,
  { shouldPersist = true }: { shouldPersist?: boolean } = {}
): void {
  cachedState = next;
  if (shouldPersist) {
    persist(next);
  }
  listeners.forEach((listener) => listener());
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

const DocumentSessionContext = createContext<DocumentSessionContextValue | null>(null);

export function DocumentSessionProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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
    const previous = cachedState ?? readStoredSession();
    setState({ ...previous, chatHistory: [...previous.chatHistory, message] });
  }, []);

  const startStreamingMessage = useCallback(() => {
    const previous = cachedState ?? readStoredSession();
    setState({ ...previous, streamingMessage: "" }, { shouldPersist: false });
  }, []);

  const appendToStreamingMessage = useCallback((delta: string) => {
    const previous = cachedState ?? readStoredSession();
    setState(
      { ...previous, streamingMessage: (previous.streamingMessage ?? "") + delta },
      { shouldPersist: false }
    );
  }, []);

  const commitStreamingMessage = useCallback(() => {
    const previous = cachedState ?? readStoredSession();
    if (previous.streamingMessage === null) return;
    setState({
      ...previous,
      chatHistory: [...previous.chatHistory, { role: "model", content: previous.streamingMessage }],
      streamingMessage: null,
    });
  }, []);

  const discardStreamingMessage = useCallback(() => {
    const previous = cachedState ?? readStoredSession();
    setState({ ...previous, streamingMessage: null }, { shouldPersist: false });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState(initialState, { shouldPersist: false });
  }, []);

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
