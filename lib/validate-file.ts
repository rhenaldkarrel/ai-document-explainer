import { ERROR_MESSAGES, MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from "@/lib/constants";
import type { SupportedMimeType } from "@/lib/types";

export type FileValidationResult =
  | { valid: true; mimeType: SupportedMimeType }
  | { valid: false; error: string };

const EXTENSION_TO_MIME_TYPE: Record<string, SupportedMimeType> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function isSupportedMimeType(type: string): type is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as string[]).includes(type);
}

/** `file.type` is empty/unreliable on some browsers and OSes — fall back to the extension. */
function resolveMimeType(file: File): SupportedMimeType | null {
  if (isSupportedMimeType(file.type)) {
    return file.type;
  }

  const dotIndex = file.name.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const extension = file.name.slice(dotIndex).toLowerCase();
  return EXTENSION_TO_MIME_TYPE[extension] ?? null;
}

export function validateFile(file: File): FileValidationResult {
  const mimeType = resolveMimeType(file);
  if (!mimeType) {
    return { valid: false, error: ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE };
  }

  if (file.size === 0) {
    return { valid: false, error: ERROR_MESSAGES.PROCESSING_ERROR };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE };
  }

  return { valid: true, mimeType };
}
