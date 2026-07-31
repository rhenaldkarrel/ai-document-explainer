import { ERROR_MESSAGES } from "@/lib/constants";
import type { ApiErrorResponse } from "@/lib/types";

/**
 * POSTs JSON and always throws an Error whose message is one of the exact PRD
 * strings: the server's own error string on a non-2xx response, or
 * NETWORK_ERROR when the request never reached the server at all (offline,
 * DNS failure, etc. — a thrown `TypeError` from `fetch`, not a response).
 */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorBody?.error ?? ERROR_MESSAGES.PROCESSING_ERROR);
  }

  return response.json() as Promise<T>;
}
