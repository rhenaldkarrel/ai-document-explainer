import type { SupportedMimeType } from "@/lib/types";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];

export const SUPPORTED_FILE_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];

/**
 * "gemini-2.5-flash" (the PRD's literal spec) returns 404 "no longer available
 * to new users" on newly issued API keys — confirmed live against the API, not
 * assumed. "gemini-flash-latest" is Google's rolling alias to their current
 * recommended fast model, which avoids re-breaking on the next deprecation wave.
 */
export const GEMINI_MODEL_ID = "gemini-flash-latest";

/** The 5 exact error strings mandated by the PRD's "Error States" section. */
export const ERROR_MESSAGES = {
  UNSUPPORTED_FILE_TYPE: "Unsupported file type.",
  FILE_TOO_LARGE: "Maximum file size is 20 MB.",
  EMPTY_AI_RESPONSE: "Unable to analyze the document.",
  PROCESSING_ERROR: "Something went wrong while processing your document.",
  NETWORK_ERROR: "Please check your internet connection and try again.",
} as const;

/** Other exact strings the PRD mandates outside the "Error States" section. */
export const UI_STRINGS = {
  NO_ACTION_ITEMS: "No action items found.",
  ANSWER_NOT_FOUND: "The requested information could not be found in the document.",
} as const;
