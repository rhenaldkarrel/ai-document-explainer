import { ApiError } from "@google/genai";
import { NextResponse } from "next/server";
import { ERROR_MESSAGES } from "@/lib/constants";
import { EmptyGeminiResponseError, streamDocumentAnswer } from "@/lib/gemini";
import { resolveGenerationSettings } from "@/lib/resolve-generation-settings";
import type { ApiErrorResponse, ChatMessage, ChatStreamFrame } from "@/lib/types";

export const maxDuration = 30;

interface ChatRequestBody {
  extractedText: string;
  history: ChatMessage[];
  question: string;
  tier?: string;
  temperature?: number;
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message } satisfies ApiErrorResponse, { status });
}

function mapChatError(error: unknown): { message: string; status: number } {
  if (error instanceof EmptyGeminiResponseError) {
    return { message: ERROR_MESSAGES.EMPTY_AI_RESPONSE, status: 502 };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { message: ERROR_MESSAGES.MODEL_UNAVAILABLE, status: 502 };
  }
  if (error instanceof ApiError && error.status === 429) {
    return { message: ERROR_MESSAGES.RATE_LIMITED, status: 429 };
  }
  console.error("Chat request failed:", error);
  return { message: ERROR_MESSAGES.PROCESSING_ERROR, status: 500 };
}

function encodeFrame(frame: ChatStreamFrame): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(frame)}\n`);
}

export async function POST(request: Request): Promise<Response> {
  let body: Partial<ChatRequestBody>;
  try {
    body = await request.json();
  } catch {
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 400);
  }

  const { extractedText, history, question, tier, temperature } = body;

  if (!extractedText || !question?.trim()) {
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 400);
  }

  const settings = resolveGenerationSettings({ tier, temperature });
  const answerStream = streamDocumentAnswer(extractedText, history ?? [], question, settings);

  // Drive the generator to its first yield (or its first failure) before
  // committing to a streaming response — an HTTP status can only be set
  // before any body bytes go out, so a failure this early still gets a clean
  // JSON error instead of an in-band error frame.
  let firstChunk: IteratorResult<string>;
  try {
    firstChunk = await answerStream.next();
  } catch (error) {
    const { message, status } = mapChatError(error);
    return errorResponse(message, status);
  }

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!firstChunk.done) {
          controller.enqueue(encodeFrame({ type: "text", value: firstChunk.value }));
        }
        for await (const textChunk of answerStream) {
          controller.enqueue(encodeFrame({ type: "text", value: textChunk }));
        }
      } catch (error) {
        const { message } = mapChatError(error);
        controller.enqueue(encodeFrame({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
