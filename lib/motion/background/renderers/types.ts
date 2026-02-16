import type {
  BackgroundBackend,
  StarfieldCanvasMetrics,
  StarfieldFrameInput,
  StarfieldRendererConfig,
} from "../types";

export interface StarfieldRenderer {
  readonly backend: BackgroundBackend;
  init(): Promise<boolean> | boolean;
  resize(metrics: StarfieldCanvasMetrics): void;
  updateConfig(config: StarfieldRendererConfig): void;
  render(frame: StarfieldFrameInput): void;
  dispose(): void;
}
