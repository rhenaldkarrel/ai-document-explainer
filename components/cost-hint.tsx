"use client";

import { MODEL_TIER_COST_HINTS, MODEL_TIERS } from "@/lib/constants";
import { formatFileSize } from "@/lib/format-file-size";
import { useSettings } from "@/lib/settings-context";

interface CostHintProps {
  fileSizeBytes: number;
}

export function CostHint({ fileSizeBytes }: CostHintProps) {
  const { tier } = useSettings();
  const tierLabel = MODEL_TIERS.find((option) => option.id === tier)?.label ?? tier;

  return (
    <p className="font-mono text-xs text-muted-foreground">
      {formatFileSize(fileSizeBytes)} on <span className="text-foreground">{tierLabel}</span> —{" "}
      {MODEL_TIER_COST_HINTS[tier]}
    </p>
  );
}
