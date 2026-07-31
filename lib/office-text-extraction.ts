import { parseOffice } from "officeparser";

/** Thrown when a .docx/.pptx file can't be parsed, or yields no usable text. */
export class TextExtractionError extends Error {
  constructor(cause?: unknown) {
    super("Failed to extract text from the document.");
    this.name = "TextExtractionError";
    if (cause !== undefined) this.cause = cause;
  }
}

/**
 * Extracts plain text from a .docx/.pptx buffer. Gemini has no native support
 * for these formats, so this stands in for `createPartFromBase64` on that path
 * — the returned text becomes both the AI's input and the response's
 * `extractedText`, rather than being re-derived by Gemini.
 */
export async function extractOfficeText(buffer: Buffer): Promise<string> {
  let ast;
  try {
    ast = await parseOffice(buffer);
  } catch (error) {
    throw new TextExtractionError(error);
  }

  const text = ast.toText().trim();
  if (!text) {
    throw new TextExtractionError();
  }

  return text;
}
