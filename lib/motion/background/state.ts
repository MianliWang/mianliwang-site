import { QUALITY_PRESET, pickInitialQuality } from "./quality";
import type { StarfieldRuntimeState, StarfieldTokens } from "./types";

type CreateRuntimeStateOptions = {
  reducedMotion: boolean;
  fineHover: boolean;
  saveData: boolean;
  tokens: StarfieldTokens;
};

export function createStarfieldRuntimeState(
  options: CreateRuntimeStateOptions,
): StarfieldRuntimeState {
  const quality = pickInitialQuality(options.saveData);

  return {
    quality,
    reducedMotion: options.reducedMotion,
    fineHover: options.fineHover,
    saveData: options.saveData,
    width: 1,
    height: 1,
    dpr: 1,
    pointerX: 0,
    pointerY: 0,
    pointerVisible: false,
    tokens: options.tokens,
    frameIntervalMs: 1000 / QUALITY_PRESET[quality].fps,
    lastRafAt: 0,
    lastDrawAt: 0,
    emaFrameDelta: 16.7,
    degradeScore: 0,
    recoverScore: 0,
    qualityLockedUntil: 0,
    running: false,
    rafId: 0,
  };
}
