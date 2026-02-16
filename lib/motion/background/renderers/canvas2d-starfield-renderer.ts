import { MAX_STARS_BY_QUALITY, QUALITY_PRESET, clamp } from "../quality";
import type {
  StarfieldCanvasMetrics,
  StarfieldFrameInput,
  StarfieldRendererConfig,
  StarfieldTokens,
} from "../types";
import type { StarfieldRenderer } from "./types";

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  driftAmpX: number;
  driftAmpY: number;
  driftPhase: number;
  driftFreq: number;
  twinkleAmp: number;
  twinklePhase: number;
  twinkleFreq: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function tokensEqual(a: StarfieldTokens, b: StarfieldTokens) {
  return (
    a.density === b.density &&
    a.brightness === b.brightness &&
    a.speed === b.speed &&
    a.twinkle === b.twinkle &&
    a.pointerRadius === b.pointerRadius &&
    a.pointerBoost === b.pointerBoost &&
    a.layerAlpha === b.layerAlpha &&
    a.rgb[0] === b.rgb[0] &&
    a.rgb[1] === b.rgb[1] &&
    a.rgb[2] === b.rgb[2]
  );
}

function createStars(
  metrics: StarfieldCanvasMetrics,
  config: StarfieldRendererConfig,
): Star[] {
  const preset = QUALITY_PRESET[config.quality];
  const area = metrics.width * metrics.height;
  const targetCount = clamp(
    Math.round(area * config.tokens.density * preset.densityScale),
    28,
    MAX_STARS_BY_QUALITY[config.quality],
  );
  const stars: Star[] = [];

  for (let index = 0; index < targetCount; index += 1) {
    const twinklePeriod = randomBetween(42, 90);
    const driftPeriod = randomBetween(46, 92);
    const isReduced = config.reducedMotion;

    stars.push({
      x: Math.random() * metrics.width,
      y: Math.random() * metrics.height,
      size: randomBetween(0.5, 1.8),
      alpha: randomBetween(0.18, 0.62) * config.tokens.brightness,
      driftAmpX: isReduced ? 0 : randomBetween(0.12, 1.2),
      driftAmpY: isReduced ? 0 : randomBetween(0.08, 0.88),
      driftPhase: Math.random() * Math.PI * 2,
      driftFreq: (Math.PI * 2) / driftPeriod,
      twinkleAmp: isReduced
        ? 0
        : randomBetween(0.03, 0.14) * config.tokens.twinkle,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleFreq: (Math.PI * 2) / twinklePeriod,
    });
  }

  return stars;
}

export class Canvas2DStarfieldRenderer implements StarfieldRenderer {
  readonly backend = "canvas2d" as const;

  private stars: Star[] = [];
  private metrics: StarfieldCanvasMetrics = {
    width: 1,
    height: 1,
    dpr: 1,
  };
  private config: StarfieldRendererConfig;
  private starsSignature = "";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
    initialConfig: StarfieldRendererConfig,
  ) {
    this.config = initialConfig;
  }

  init() {
    return true;
  }

  resize(metrics: StarfieldCanvasMetrics) {
    this.metrics = metrics;

    this.canvas.width = Math.max(1, Math.round(metrics.width * metrics.dpr));
    this.canvas.height = Math.max(1, Math.round(metrics.height * metrics.dpr));
    this.context.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);

    this.rebuildStars(true);
  }

  updateConfig(config: StarfieldRendererConfig) {
    const shouldRebuild =
      config.quality !== this.config.quality ||
      config.reducedMotion !== this.config.reducedMotion ||
      !tokensEqual(config.tokens, this.config.tokens);

    this.config = config;

    if (shouldRebuild) {
      this.rebuildStars(true);
    }
  }

  render(frame: StarfieldFrameInput) {
    const { width, height } = this.metrics;
    this.context.clearRect(0, 0, width, height);

    const pointerEnabled =
      this.config.fineHover && !this.config.reducedMotion && frame.pointerVisible;
    const pointerRadius =
      this.config.tokens.pointerRadius *
      QUALITY_PRESET[this.config.quality].pointerScale;
    const radiusSquared = pointerRadius * pointerRadius;
    const animated = !this.config.reducedMotion;
    const time = (frame.timestamp / 1000) * this.config.tokens.speed;

    for (const star of this.stars) {
      let x = star.x;
      let y = star.y;
      let alpha = star.alpha;
      let size = star.size;

      if (animated) {
        const driftPhase = star.driftPhase + time * star.driftFreq;
        x += Math.sin(driftPhase) * star.driftAmpX;
        y += Math.cos(driftPhase * 0.86 + star.driftPhase * 0.4) * star.driftAmpY;
        alpha +=
          Math.sin(star.twinklePhase + time * star.twinkleFreq) * star.twinkleAmp;
      }

      if (pointerEnabled) {
        const dx = x - frame.pointerX;
        const dy = y - frame.pointerY;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < radiusSquared) {
          const distance = Math.sqrt(distanceSquared);
          const falloff = 1 - distance / pointerRadius;
          const boost = this.config.tokens.pointerBoost * falloff * falloff;
          alpha += boost;
          size += falloff * 0.5;
        }
      }

      const finalAlpha = clamp(alpha * this.config.tokens.layerAlpha, 0.01, 0.72);
      if (finalAlpha <= 0) {
        continue;
      }

      const [r, g, b] = this.config.tokens.rgb;
      this.context.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalAlpha.toFixed(4)})`;

      if (size <= 1.08) {
        this.context.fillRect(x, y, size, size);
      } else {
        this.context.beginPath();
        this.context.arc(x, y, size * 0.5, 0, Math.PI * 2);
        this.context.fill();
      }
    }
  }

  dispose() {
    this.stars = [];
    this.starsSignature = "";
  }

  private rebuildStars(force = false) {
    const signature = [
      this.metrics.width,
      this.metrics.height,
      this.config.quality,
      this.config.reducedMotion ? "1" : "0",
      this.config.tokens.density,
      this.config.tokens.brightness,
      this.config.tokens.twinkle,
      this.config.tokens.speed,
      this.config.tokens.pointerRadius,
      this.config.tokens.pointerBoost,
      this.config.tokens.layerAlpha,
      this.config.tokens.rgb.join(","),
    ].join("|");

    if (!force && signature === this.starsSignature) {
      return;
    }

    this.starsSignature = signature;
    this.stars = createStars(this.metrics, this.config);
  }
}
