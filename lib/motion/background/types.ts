export type BackgroundQualityLevel = "high" | "medium" | "low";
export type BackgroundBackend = "canvas2d" | "webgpu";

export type StarfieldTokens = {
  density: number;
  brightness: number;
  speed: number;
  twinkle: number;
  pointerRadius: number;
  pointerBoost: number;
  layerAlpha: number;
  rgb: [number, number, number];
};

export type QualityPreset = {
  densityScale: number;
  dprCap: number;
  fps: number;
  pointerScale: number;
};

export type StarfieldRendererConfig = {
  quality: BackgroundQualityLevel;
  reducedMotion: boolean;
  fineHover: boolean;
  tokens: StarfieldTokens;
};

export type StarfieldCanvasMetrics = {
  width: number;
  height: number;
  dpr: number;
};

export type StarfieldFrameInput = {
  timestamp: number;
  pointerX: number;
  pointerY: number;
  pointerVisible: boolean;
};

export type StarfieldRuntimeState = {
  quality: BackgroundQualityLevel;
  reducedMotion: boolean;
  fineHover: boolean;
  saveData: boolean;
  width: number;
  height: number;
  dpr: number;
  pointerX: number;
  pointerY: number;
  pointerVisible: boolean;
  tokens: StarfieldTokens;
  frameIntervalMs: number;
  lastRafAt: number;
  lastDrawAt: number;
  emaFrameDelta: number;
  degradeScore: number;
  recoverScore: number;
  qualityLockedUntil: number;
  running: boolean;
  rafId: number;
};
