import { clamp } from "./quality";
import type { StarfieldTokens } from "./types";

function readCssNumber(
  style: CSSStyleDeclaration,
  token: string,
  fallback: number,
) {
  const raw = style.getPropertyValue(token);
  const parsed = Number.parseFloat(raw.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCssRgb(
  style: CSSStyleDeclaration,
  token: string,
  fallback: [number, number, number],
): [number, number, number] {
  const raw = style.getPropertyValue(token).trim();
  const matches = raw.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length < 3) {
    return fallback;
  }

  const [r, g, b] = matches.slice(0, 3).map((value) => Number(value));
  if (![r, g, b].every((value) => Number.isFinite(value))) {
    return fallback;
  }

  return [
    clamp(Math.round(r), 0, 255),
    clamp(Math.round(g), 0, 255),
    clamp(Math.round(b), 0, 255),
  ];
}

export function readStarfieldTokens(): StarfieldTokens {
  const style = window.getComputedStyle(document.documentElement);

  return {
    density: readCssNumber(style, "--starfield-density", 0.000055),
    brightness: readCssNumber(style, "--starfield-brightness", 0.6),
    speed: readCssNumber(style, "--starfield-speed", 1),
    twinkle: readCssNumber(style, "--starfield-twinkle", 0.2),
    pointerRadius: readCssNumber(style, "--starfield-pointer-radius", 180),
    pointerBoost: readCssNumber(style, "--starfield-pointer-boost", 0.25),
    layerAlpha: readCssNumber(style, "--starfield-layer-alpha", 0.42),
    rgb: readCssRgb(style, "--starfield-rgb", [220, 235, 230]),
  };
}
