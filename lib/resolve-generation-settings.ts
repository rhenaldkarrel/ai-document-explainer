import {
  DEFAULT_MODEL_TIER,
  DEFAULT_TEMPERATURE,
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
  MODEL_TIERS,
} from "@/lib/constants";
import type { GenerationSettings, ModelTier } from "@/lib/types";

function isModelTier(value: unknown): value is ModelTier {
  return typeof value === "string" && MODEL_TIERS.some((tier) => tier.id === value);
}

/**
 * Never trust a client-supplied model tier or temperature directly — a stale
 * or tampered localStorage value must fall back to safe defaults instead of
 * reaching the Gemini call.
 */
export function resolveGenerationSettings(input: {
  tier?: unknown;
  temperature?: unknown;
}): GenerationSettings {
  const tier = isModelTier(input.tier) ? input.tier : DEFAULT_MODEL_TIER;

  const temperature =
    typeof input.temperature === "number" && Number.isFinite(input.temperature)
      ? Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, input.temperature))
      : DEFAULT_TEMPERATURE;

  return { tier, temperature };
}
