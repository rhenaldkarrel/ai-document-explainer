import { ERROR_MESSAGES, MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from "@/lib/constants";
import type { SupportedMimeType } from "@/lib/types";

export type FileValidationResult = { valid: true } | { valid: false; error: string };

function isSupportedMimeType(type: string): type is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as string[]).includes(type);
}

export function validateFile(file: File): FileValidationResult {
  if (!isSupportedMimeType(file.type)) {
    return { valid: false, error: ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  return { valid: true };
}
