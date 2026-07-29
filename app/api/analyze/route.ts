import { del, get } from "@vercel/blob";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { ERROR_MESSAGES, MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from "@/lib/constants";
import { EmptyAnalysisError, analyzeDocument } from "@/lib/gemini";
import type { AnalyzeApiResponse, ApiErrorResponse } from "@/lib/types";

export const maxDuration = 30;

interface AnalyzeRequestBody {
  blobUrl: string;
  mimeType: string;
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

  const { blobUrl, mimeType } = body;

  if (!blobUrl || !mimeType) {
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 400);
  }

  if (!(SUPPORTED_MIME_TYPES as string[]).includes(mimeType)) {
    return errorResponse(ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE, 400);
  }

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

  try {
    const blob = await get(blobUrl, { access: "private", token });
    if (!blob) {
      return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 404);
    }

    const arrayBuffer = await new Response(blob.stream).arrayBuffer();

    if (arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      scheduleCleanup();
      return errorResponse(ERROR_MESSAGES.FILE_TOO_LARGE, 400);
    }

    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const { analysis, extractedText } = await analyzeDocument(base64Data, mimeType);

    scheduleCleanup();
    return NextResponse.json({ analysis, extractedText } satisfies AnalyzeApiResponse);
  } catch (error) {
    scheduleCleanup();

    if (error instanceof EmptyAnalysisError) {
      return errorResponse(ERROR_MESSAGES.EMPTY_AI_RESPONSE, 502);
    }

    console.error("Document analysis failed:", error);
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 500);
  }
}
