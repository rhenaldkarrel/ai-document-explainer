"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_MODEL_TIER,
  DEFAULT_TEMPERATURE,
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
} from "@/lib/constants";
import type { GenerationSettings, ModelTier } from "@/lib/types";

const STORAGE_KEY = "ai-document-explainer:settings:v1";

const defaultSettings: GenerationSettings = {
  tier: DEFAULT_MODEL_TIER,
  temperature: DEFAULT_TEMPERATURE,
};

function isModelTier(value: unknown): value is ModelTier {
  return value === "flash-lite" || value === "flash" || value === "pro";
}

function readStoredSettings(): GenerationSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;

    const parsed = JSON.parse(raw) as Partial<GenerationSettings>;
    const tier = isModelTier(parsed.tier) ? parsed.tier : defaultSettings.tier;
    const temperature =
      typeof parsed.temperature === "number" && Number.isFinite(parsed.temperature)
        ? Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, parsed.temperature))
        : defaultSettings.temperature;

    return { tier, temperature };
  } catch {
    return defaultSettings;
  }
}

// A single module-level store: this is a client-only, app-wide singleton
// preference, so there's only ever one to synchronize via useSyncExternalStore.
let cachedSettings: GenerationSettings | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): GenerationSettings {
  if (cachedSettings === null) {
    cachedSettings = readStoredSettings();
  }
  return cachedSettings;
}

// Returns the same defaults the server rendered, so the hydration pass
// matches — useSyncExternalStore then swaps to the real client value and
// re-renders, instead of writing state from inside an effect.
function getServerSnapshot(): GenerationSettings {
  return defaultSettings;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function updateSettings(updater: (previous: GenerationSettings) => GenerationSettings): void {
  const next = updater(cachedSettings ?? readStoredSettings());
  cachedSettings = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (e.g. Safari private mode) — settings stay in-memory for this session.
  }

  listeners.forEach((listener) => listener());
}

interface SettingsContextValue extends GenerationSettings {
  setTier: (tier: ModelTier) => void;
  setTemperature: (temperature: number) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTier = useCallback((tier: ModelTier) => {
    updateSettings((previous) => ({ ...previous, tier }));
  }, []);

  const setTemperature = useCallback((temperature: number) => {
    updateSettings((previous) => ({ ...previous, temperature }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ ...settings, setTier, setTemperature }),
    [settings, setTier, setTemperature]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
