import { ApiError } from "@google/genai";
import { del, get } from "@vercel/blob";
import { NextResponse, after } from "next/server";
import { ERROR_MESSAGES, MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from "@/lib/constants";
import { EmptyGeminiResponseError, analyzeDocument } from "@/lib/gemini";
import { resolveGenerationSettings } from "@/lib/resolve-generation-settings";
import type { AnalyzeApiResponse, ApiErrorResponse } from "@/lib/types";

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

    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const { analysis, extractedText } = await analyzeDocument(base64Data, mimeType, settings);

    scheduleCleanup();
    return NextResponse.json({ analysis, extractedText } satisfies AnalyzeApiResponse);
  } catch (error) {
    scheduleCleanup();

    if (error instanceof EmptyGeminiResponseError) {
      return errorResponse(ERROR_MESSAGES.EMPTY_AI_RESPONSE, 502);
    }

    if (error instanceof ApiError && error.status === 404) {
      return errorResponse(ERROR_MESSAGES.MODEL_UNAVAILABLE, 502);
    }

    if (error instanceof ApiError && error.status === 429) {
      return errorResponse(ERROR_MESSAGES.RATE_LIMITED, 429);
    }

    console.error("Document analysis failed:", error);
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 500);
  }
}
