import { GoogleGenAI, Type } from "@google/genai";
import { UI_STRINGS } from "@/lib/constants";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Forces generateContent to return { summary, keyPoints, actionItems, extractedText }.
 * extractedText is a faithful full-text transcript of the document, produced in the
 * same call so /api/chat can answer follow-up questions without re-uploading the file.
 */
export const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "Executive summary of the document, maximum 200 words, written in the same language as the original document.",
    },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5 to 10 important bullet points from the document.",
    },
    actionItems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Deadlines, required actions, obligations, or tasks found in the document. Empty array if none.",
    },
    extractedText: {
      type: Type.STRING,
      description:
        "A faithful full-text transcript of the document's content, used to answer follow-up questions later.",
    },
  },
  required: ["summary", "keyPoints", "actionItems", "extractedText"],
};

export const ANALYSIS_SYSTEM_INSTRUCTION = `You are a document analysis assistant. Given the contents of an uploaded document, produce a structured analysis:
- summary: an executive summary, maximum 200 words, written in the same language as the original document.
- keyPoints: 5 to 10 important bullet points from the document.
- actionItems: deadlines, required actions, obligations, or tasks found in the document. Return an empty array if there are none — do not invent any.
- extractedText: a faithful full-text transcript of the document's content, preserving as much structure as reasonably possible.
Do not speculate or add information that is not present in the document.`;

export const CHAT_SYSTEM_INSTRUCTION = `You are answering questions about a specific document on the user's behalf. You are given the document's full text and the prior conversation. Answer the user's question using only information contained in the document text. Do not speculate or use outside knowledge. If the answer cannot be found in the document, respond with exactly: "${UI_STRINGS.ANSWER_NOT_FOUND}"`;
