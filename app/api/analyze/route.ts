import { ApiError } from "@google/genai";
import { del, get } from "@vercel/blob";
import { NextResponse, after } from "next/server";
import {
  ERROR_MESSAGES,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
  isOfficeMimeType,
} from "@/lib/constants";
import { EmptyGeminiResponseError, analyzeDocument, analyzeExtractedText } from "@/lib/gemini";
import { TextExtractionError, extractOfficeText } from "@/lib/office-text-extraction";
import { resolveGenerationSettings } from "@/lib/resolve-generation-settings";
import type {
  AnalyzeApiResponse,
  ApiErrorResponse,
  DocumentAnalysis,
  GenerationSettings,
} from "@/lib/types";

export const maxDuration = 30;

interface AnalyzeRequestBody {
  blobUrl: string;
  mimeType: string;
  tier?: string;
  temperature?: number;
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message } satisfies ApiErrorResponse, { status });
}

async function runAnalysis(
  mimeType: string,
  arrayBuffer: ArrayBuffer,
  settings: GenerationSettings,
): Promise<{ analysis: DocumentAnalysis; extractedText: string; suggestedQuestions: string[] }> {
  if (isOfficeMimeType(mimeType)) {
    // Gemini can't read .docx/.pptx natively — extract text first, and use
    // that extraction (not a Gemini-produced echo) as the response's
    // extractedText.
    const extractedText = await extractOfficeText(Buffer.from(arrayBuffer));
    const { analysis, suggestedQuestions } = await analyzeExtractedText(extractedText, settings);
    return { analysis, extractedText, suggestedQuestions };
  }

  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  return analyzeDocument(base64Data, mimeType, settings);
}

function mapAnalysisError(error: unknown): { message: string; status: number } {
  if (error instanceof TextExtractionError) {
    return { message: ERROR_MESSAGES.UNREADABLE_DOCUMENT, status: 400 };
  }
  if (error instanceof EmptyGeminiResponseError) {
    return { message: ERROR_MESSAGES.EMPTY_AI_RESPONSE, status: 502 };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { message: ERROR_MESSAGES.MODEL_UNAVAILABLE, status: 502 };
  }
  if (error instanceof ApiError && error.status === 429) {
    return { message: ERROR_MESSAGES.RATE_LIMITED, status: 429 };
  }
  console.error("Document analysis failed:", error);
  return { message: ERROR_MESSAGES.PROCESSING_ERROR, status: 500 };
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Partial<AnalyzeRequestBody>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 400);
  }

  const { blobUrl, mimeType, tier, temperature } = body;

  if (!blobUrl || !mimeType) {
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 400);
  }

  const settings = resolveGenerationSettings({ tier, temperature });

  // The client already uploaded the blob by this point, so every return path from
  // here on must clean it up — including validation failures below, not just the
  // paths inside the try block.
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const scheduleCleanup = () =>
    after(async () => {
      console.log("[analyze] cleanup: deleting blob", blobUrl);
      try {
        await del(blobUrl, { token });
        console.log("[analyze] cleanup: blob deleted", blobUrl);
      } catch (cleanupError) {
        console.error("[analyze] cleanup: failed to delete blob", blobUrl, cleanupError);
      }
    });

  if (!(SUPPORTED_MIME_TYPES as string[]).includes(mimeType)) {
    scheduleCleanup();
    return errorResponse(ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE, 400);
  }

  try {
    const blob = await get(blobUrl, { access: "private", token });
    if (!blob) {
      return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 404);
    }

    const arrayBuffer = await new Response(blob.stream).arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      scheduleCleanup();
      return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 400);
    }

    if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      scheduleCleanup();
      return errorResponse(ERROR_MESSAGES.FILE_TOO_LARGE, 400);
    }

    const { analysis, extractedText, suggestedQuestions } = await runAnalysis(
      mimeType,
      arrayBuffer,
      settings,
    );

    scheduleCleanup();
    return NextResponse.json({
      analysis,
      extractedText,
      suggestedQuestions,
    } satisfies AnalyzeApiResponse);
  } catch (error) {
    scheduleCleanup();
    const { message, status } = mapAnalysisError(error);
    return errorResponse(message, status);
  }
}
