import type {
  StarfieldCanvasMetrics,
  StarfieldFrameInput,
  StarfieldRendererConfig,
} from "../types";
import type { StarfieldRenderer } from "./types";

/**
 * Phase A placeholder:
 * keep runtime contract ready while defaulting to Canvas2D.
 */
export class WebGPUStarfieldRenderer implements StarfieldRenderer {
  readonly backend = "webgpu" as const;

  constructor(
    private readonly _canvas: HTMLCanvasElement,
    private readonly _config: StarfieldRendererConfig,
  ) {}

  async init() {
    return false;
  }

  resize(metrics: StarfieldCanvasMetrics) {
    void metrics;
  }

  updateConfig(config: StarfieldRendererConfig) {
    void config;
  }

  render(frame: StarfieldFrameInput) {
    void frame;
  }

  dispose() {}
}
