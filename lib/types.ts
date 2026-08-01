/** Formats Gemini reads natively as multimodal input (no text-extraction step needed). */
export type NativeMimeType =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "audio/wav"
  | "audio/mpeg"
  | "audio/aac"
  | "audio/ogg"
  | "audio/flac"
  | "audio/m4a";

/** Formats Gemini can't read natively — text is extracted server-side first. */
export type OfficeMimeType =
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type SupportedMimeType = NativeMimeType | OfficeMimeType;

export type ModelTier = "flash-lite" | "flash" | "pro";

export interface GenerationSettings {
  tier: ModelTier;
  temperature: number;
}

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

/**
 * Response from POST /api/analyze. `extractedText` is never rendered
 * directly — it is cached client-side and resent to /api/chat so the
 * original file never has to be re-uploaded to answer follow-up questions.
 */
export interface AnalyzeApiResponse {
  analysis: DocumentAnalysis;
  extractedText: string;
  suggestedQuestions: string[];
}

export type ChatRole = "user" | "model";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * POST /api/chat streams its response as newline-delimited JSON frames
 * instead of a single JSON body, so a mid-answer failure can still be
 * signaled after tokens have already been sent (a plain HTTP status can only
 * be set before the body starts). The stream closing cleanly (no trailing
 * "error" frame) signals success.
 */
export type ChatStreamFrame = { type: "text"; value: string } | { type: "error"; message: string };

export interface ApiErrorResponse {
  error: string;
  /** POST /api/analyze only: true when the client can retry with the same already-uploaded blob instead of re-uploading. */
  retryable?: boolean;
}
