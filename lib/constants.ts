import type { ModelTier, NativeMimeType, OfficeMimeType, SupportedMimeType } from "@/lib/types";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Passed straight to Gemini as multimodal input — see `NativeMimeType`. */
export const NATIVE_MIME_TYPES: NativeMimeType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "audio/wav",
  "audio/mpeg",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
];

/** Text-extracted server-side before reaching Gemini — see `OfficeMimeType`. */
export const OFFICE_MIME_TYPES: OfficeMimeType[] = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  ...NATIVE_MIME_TYPES,
  ...OFFICE_MIME_TYPES,
];

export function isOfficeMimeType(mimeType: string): mimeType is OfficeMimeType {
  return (OFFICE_MIME_TYPES as string[]).includes(mimeType);
}

export const SUPPORTED_FILE_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".wav",
  ".mp3",
  ".aac",
  ".ogg",
  ".flac",
  ".m4a",
  ".docx",
  ".pptx",
];

interface ModelTierOption {
  id: ModelTier;
  modelId: string;
  label: string;
  description: string;
}

/**
 * Rolling "-latest" aliases, not dated model IDs — same reasoning as the
 * former GEMINI_MODEL_ID constant below: a pinned ID like "gemini-2.5-flash"
 * 404'd on a freshly issued API key ("no longer available to new users"),
 * confirmed live against the API. All three of these aliases were confirmed
 * live via `ai.models.list()` and a real `generateContent` call against this
 * project's API key before being hardcoded here.
 */
export const MODEL_TIERS: ModelTierOption[] = [
  {
    id: "flash-lite",
    modelId: "gemini-flash-lite-latest",
    label: "Flash-Lite",
    description: "Cheapest and fastest. Best for quick, everyday documents.",
  },
  {
    id: "flash",
    modelId: "gemini-flash-latest",
    label: "Flash",
    description: "Balanced speed and quality. A good default for most documents.",
  },
  {
    id: "pro",
    modelId: "gemini-pro-latest",
    label: "Pro",
    description: "Most capable, highest cost. Best for complex or nuanced documents.",
  },
];

export const DEFAULT_MODEL_TIER: ModelTier = "flash-lite";

export const DEFAULT_TEMPERATURE = 1;
export const MIN_TEMPERATURE = 0;
export const MAX_TEMPERATURE = 2;
export const TEMPERATURE_STEP = 0.1;

/** The exact error strings mandated by the PRD's "Error States" section, plus additions for this round of work. */
export const ERROR_MESSAGES = {
  UNSUPPORTED_FILE_TYPE: "Unsupported file type.",
  FILE_TOO_LARGE: "Maximum file size is 20 MB.",
  EMPTY_AI_RESPONSE: "Unable to analyze the document.",
  PROCESSING_ERROR: "Something went wrong while processing your document.",
  NETWORK_ERROR: "Please check your internet connection and try again.",
  MODEL_UNAVAILABLE: "The selected AI model is temporarily unavailable. Please choose a different model.",
  RATE_LIMITED: "The selected AI model has hit its usage limit. Please try again shortly or choose a different model.",
  UNREADABLE_DOCUMENT: "This document could not be read. It may be corrupted or password-protected.",
} as const;

/** Other exact strings the PRD mandates outside the "Error States" section. */
export const UI_STRINGS = {
  NO_ACTION_ITEMS: "No action items found.",
  ANSWER_NOT_FOUND: "The requested information could not be found in the document.",
} as const;
