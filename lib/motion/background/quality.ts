import type { BackgroundQualityLevel, QualityPreset } from "./types";

export const QUALITY_ORDER: BackgroundQualityLevel[] = ["low", "medium", "high"];

export const MAX_STARS_BY_QUALITY: Record<BackgroundQualityLevel, number> = {
  high: 320,
  medium: 220,
  low: 140,
};

export const QUALITY_PRESET: Record<BackgroundQualityLevel, QualityPreset> = {
  high: {
    densityScale: 1,
    dprCap: 1.5,
    fps: 60,
    pointerScale: 1,
  },
  medium: {
    densityScale: 0.72,
    dprCap: 1.2,
    fps: 40,
    pointerScale: 0.9,
  },
  low: {
    densityScale: 0.5,
    dprCap: 1,
    fps: 30,
    pointerScale: 0.82,
  },
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lowerQuality(
  current: BackgroundQualityLevel,
): BackgroundQualityLevel {
  const index = QUALITY_ORDER.indexOf(current);
  if (index <= 0) {
    return current;
  }

  return QUALITY_ORDER[index - 1];
}

export function higherQuality(
  current: BackgroundQualityLevel,
): BackgroundQualityLevel {
  const index = QUALITY_ORDER.indexOf(current);
  if (index >= QUALITY_ORDER.length - 1) {
    return current;
  }

  return QUALITY_ORDER[index + 1];
}

export function pickInitialQuality(saveData: boolean): BackgroundQualityLevel {
  if (saveData) {
    return "low";
  }

  const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  const hardwareConcurrency = navigator.hardwareConcurrency;

  if (
    (typeof deviceMemory === "number" && deviceMemory <= 4) ||
    (typeof hardwareConcurrency === "number" && hardwareConcurrency <= 4)
  ) {
    return "medium";
  }

  return "high";
}

export function getDegradeThreshold(quality: BackgroundQualityLevel) {
  if (quality === "high") {
    return 21.8;
  }

  if (quality === "medium") {
    return 27.2;
  }

  return 33;
}

export function getUpgradeThreshold(quality: BackgroundQualityLevel) {
  if (quality === "low") {
    return 18.5;
  }

  if (quality === "medium") {
    return 16.3;
  }

  return 0;
}
