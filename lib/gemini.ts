import { GoogleGenAI, Type, createPartFromBase64 } from '@google/genai';
import { MODEL_TIERS, UI_STRINGS } from '@/lib/constants';
import type { ChatMessage, DocumentAnalysis, GenerationSettings } from '@/lib/types';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set.');
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Fields shared by both analysis schema variants below. `extractedText` is
 * deliberately excluded here — the file-based variant asks Gemini to produce
 * it (a transcript of bytes it can natively read), while the pre-extracted-text
 * variant (used for .docx/.pptx) already has faithful text from officeparser
 * and would only get a lossier echo by asking Gemini to reproduce it.
 */
const BASE_ANALYSIS_SCHEMA_PROPERTIES = {
  summary: {
    type: Type.STRING,
    description:
      'Executive summary of the document, maximum 200 words, written in the same language as the original document.',
  },
  keyPoints: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: '5 to 10 important bullet points from the document.',
  },
  actionItems: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description:
      'Deadlines, required actions, obligations, or tasks found in the document. Empty array if none.',
  },
  suggestedQuestions: {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description:
      '3 to 4 short, specific questions a reader would plausibly ask about this document, answerable from its content.',
  },
};

const BASE_ANALYSIS_REQUIRED = ['summary', 'keyPoints', 'actionItems', 'suggestedQuestions'];

/** Forces generateContent to return { summary, keyPoints, actionItems, extractedText, suggestedQuestions }. */
export const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ...BASE_ANALYSIS_SCHEMA_PROPERTIES,
    extractedText: {
      type: Type.STRING,
      description:
        "A faithful full-text transcript of the document's content, used to answer follow-up questions later.",
    },
  },
  required: [...BASE_ANALYSIS_REQUIRED, 'extractedText'],
};

/** Same as above, minus `extractedText` — used when the caller already has faithful extracted text. */
const TEXT_ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: BASE_ANALYSIS_SCHEMA_PROPERTIES,
  required: BASE_ANALYSIS_REQUIRED,
};

const BASE_ANALYSIS_INSTRUCTION = `You are a document analysis assistant. Given the contents of a document, produce a structured analysis:
- summary: an executive summary, maximum 200 words, written in the same language as the original document.
- keyPoints: 5 to 10 important bullet points from the document.
- actionItems: deadlines, required actions, obligations, or tasks found in the document. Return an empty array if there are none — do not invent any.
- suggestedQuestions: 3 to 4 short, specific questions a reader would plausibly ask about this document, each answerable from its content.
Do not speculate or add information that is not present in the document.`;

export const ANALYSIS_SYSTEM_INSTRUCTION = `${BASE_ANALYSIS_INSTRUCTION}
Additionally produce:
- extractedText: a faithful full-text transcript of the document's content, preserving as much structure as reasonably possible.`;

const TEXT_ANALYSIS_SYSTEM_INSTRUCTION = BASE_ANALYSIS_INSTRUCTION;

export const CHAT_SYSTEM_INSTRUCTION = `You are answering questions about a specific document on the user's behalf. You are given the document's full text and the prior conversation. Answer the user's question using only information contained in the document text. Do not speculate or use outside knowledge. If the answer cannot be found in the document, respond with exactly: "${UI_STRINGS.ANSWER_NOT_FOUND}"`;

/** Thrown when Gemini returns an empty or unparseable response. */
export class EmptyGeminiResponseError extends Error {
  constructor() {
    super('Gemini returned an empty or unparseable response.');
    this.name = 'EmptyGeminiResponseError';
  }
}

/** Resolves a `GenerationSettings.tier` to the actual Gemini model ID it maps to. */
function resolveModelId(tier: GenerationSettings['tier']): string {
  const option = MODEL_TIERS.find((tierOption) => tierOption.id === tier);
  if (!option) {
    throw new Error(`Unknown model tier: ${tier}`);
  }
  return option.modelId;
}

export async function analyzeDocument(
  base64Data: string,
  mimeType: string,
  settings: GenerationSettings,
): Promise<{ analysis: DocumentAnalysis; extractedText: string; suggestedQuestions: string[] }> {
  const ai = getGeminiClient();
  const filePart = createPartFromBase64(base64Data, mimeType);

  const response = await ai.models.generateContent({
    model: resolveModelId(settings.tier),
    contents: [filePart, { text: 'Analyze the attached document.' }],
    config: {
      systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_RESPONSE_SCHEMA,
      temperature: settings.temperature,
    },
  });

  const text = response.text;
  if (!text) {
    throw new EmptyGeminiResponseError();
  }

  let parsed: DocumentAnalysis & { extractedText: string; suggestedQuestions: string[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new EmptyGeminiResponseError();
  }

  const { extractedText, suggestedQuestions, ...analysis } = parsed;
  return { analysis, extractedText, suggestedQuestions };
}

/**
 * Same analysis as `analyzeDocument`, but for formats Gemini can't read
 * natively (.docx/.pptx) — the caller has already extracted faithful text
 * (via officeparser), so it's sent as a text part instead of a file part,
 * and Gemini isn't asked to reproduce it.
 */
export async function analyzeExtractedText(
  extractedText: string,
  settings: GenerationSettings,
): Promise<{ analysis: DocumentAnalysis; suggestedQuestions: string[] }> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: resolveModelId(settings.tier),
    contents: [
      { text: `Analyze the following document:\n\n"""\n${extractedText}\n"""` },
    ],
    config: {
      systemInstruction: TEXT_ANALYSIS_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: TEXT_ANALYSIS_RESPONSE_SCHEMA,
      temperature: settings.temperature,
    },
  });

  const text = response.text;
  if (!text) {
    throw new EmptyGeminiResponseError();
  }

  let parsed: DocumentAnalysis & { suggestedQuestions: string[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new EmptyGeminiResponseError();
  }

  const { suggestedQuestions, ...analysis } = parsed;
  return { analysis, suggestedQuestions };
}

/**
 * Yields the answer as it's generated. Throws `EmptyGeminiResponseError` if
 * the stream ends without ever producing text — since that check happens
 * before this generator's first `yield`, a caller's first `.next()` call
 * rejects with it rather than silently completing, letting a route handler
 * distinguish "failed before any output" from "failed partway through".
 */
export async function* streamDocumentAnswer(
  extractedText: string,
  history: ChatMessage[],
  question: string,
  settings: GenerationSettings,
): AsyncGenerator<string> {
  const ai = getGeminiClient();

  const systemInstruction = `${CHAT_SYSTEM_INSTRUCTION}\n\nDocument content:\n"""\n${extractedText}\n"""`;

  const contents = [
    ...history.map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ];

  const stream = await ai.models.generateContentStream({
    model: resolveModelId(settings.tier),
    contents,
    config: { systemInstruction, temperature: settings.temperature },
  });

  let receivedAny = false;
  for await (const chunk of stream) {
    if (chunk.text) {
      receivedAny = true;
      yield chunk.text;
    }
  }

  if (!receivedAny) {
    throw new EmptyGeminiResponseError();
  }
}
