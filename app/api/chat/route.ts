import { ApiError } from "@google/genai";
import { NextResponse } from "next/server";
import { ERROR_MESSAGES } from "@/lib/constants";
import { EmptyGeminiResponseError, askDocumentQuestion } from "@/lib/gemini";
import { resolveGenerationSettings } from "@/lib/resolve-generation-settings";
import type { ApiErrorResponse, ChatApiResponse, ChatMessage } from "@/lib/types";

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

export async function POST(request: Request): Promise<NextResponse> {
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

  try {
    const answer = await askDocumentQuestion(extractedText, history ?? [], question, settings);
    return NextResponse.json({ answer } satisfies ChatApiResponse);
  } catch (error) {
    if (error instanceof EmptyGeminiResponseError) {
      return errorResponse(ERROR_MESSAGES.EMPTY_AI_RESPONSE, 502);
    }

    if (error instanceof ApiError && error.status === 404) {
      return errorResponse(ERROR_MESSAGES.MODEL_UNAVAILABLE, 502);
    }

    if (error instanceof ApiError && error.status === 429) {
      return errorResponse(ERROR_MESSAGES.RATE_LIMITED, 429);
    }

    console.error("Chat request failed:", error);
    return errorResponse(ERROR_MESSAGES.PROCESSING_ERROR, 500);
  }
}
