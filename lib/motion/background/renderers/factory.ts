import { canUseWebGPUBackground } from "../capabilities";
import type { StarfieldRendererConfig } from "../types";
import { Canvas2DStarfieldRenderer } from "./canvas2d-starfield-renderer";
import type { StarfieldRenderer } from "./types";
import { WebGPUStarfieldRenderer } from "./webgpu-starfield-renderer";

type CreateRendererOptions = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  initialConfig: StarfieldRendererConfig;
};

export async function createStarfieldRenderer({
  canvas,
  context,
  initialConfig,
}: CreateRendererOptions): Promise<StarfieldRenderer> {
  if (await canUseWebGPUBackground()) {
    const webgpuRenderer = new WebGPUStarfieldRenderer(canvas, initialConfig);
    const initialized = await webgpuRenderer.init();
    if (initialized) {
      return webgpuRenderer;
    }

    webgpuRenderer.dispose();
  }

  const canvasRenderer = new Canvas2DStarfieldRenderer(
    canvas,
    context,
    initialConfig,
  );
  canvasRenderer.init();
  return canvasRenderer;
}
