export type SupportedMimeType = "application/pdf" | "image/png" | "image/jpeg";

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
}

export type ChatRole = "user" | "model";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatApiRequest {
  extractedText: string;
  history: ChatMessage[];
  question: string;
}

export interface ChatApiResponse {
  answer: string;
}

export interface ApiErrorResponse {
  error: string;
}
