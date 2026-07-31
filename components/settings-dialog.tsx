"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MAX_TEMPERATURE, MIN_TEMPERATURE, MODEL_TIERS, TEMPERATURE_STEP } from "@/lib/constants";
import { useSettings } from "@/lib/settings-context";
import type { ModelTier } from "@/lib/types";

export function SettingsDialog() {
  const { tier, temperature, setTier, setTemperature } = useSettings();
  const selectedTier = MODEL_TIERS.find((option) => option.id === tier);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 right-4 z-40 rounded-full"
          />
        }
      >
        <Settings aria-hidden />
        <span className="sr-only">Settings</span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Choose the AI model and creativity level used for new analyses and chat messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="model-tier">
              Model
            </label>
            <Select
              value={tier}
              onValueChange={(value) => setTier(value as ModelTier)}
              items={MODEL_TIERS.map((option) => ({ value: option.id, label: option.label }))}
            >
              <SelectTrigger id="model-tier" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_TIERS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTier && (
              <p className="text-xs text-muted-foreground">{selectedTier.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="temperature">
                Temperature
              </label>
              <span className="text-xs text-muted-foreground">{temperature.toFixed(1)}</span>
            </div>
            <Slider
              id="temperature"
              min={MIN_TEMPERATURE}
              max={MAX_TEMPERATURE}
              step={TEMPERATURE_STEP}
              value={[temperature]}
              onValueChange={(value) => setTemperature((value as number[])[0])}
            />
            <p className="text-xs text-muted-foreground">
              Lower is more focused and consistent; higher is more creative and varied.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
