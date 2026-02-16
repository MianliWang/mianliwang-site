"use client";

import { useEffect, useRef } from "react";
import { getConnectionSaveData } from "@/lib/motion/background/capabilities";
import {
  clamp,
  getDegradeThreshold,
  getUpgradeThreshold,
  higherQuality,
  lowerQuality,
  QUALITY_PRESET,
} from "@/lib/motion/background/quality";
import { createStarfieldRenderer } from "@/lib/motion/background/renderers/factory";
import type { StarfieldRenderer } from "@/lib/motion/background/renderers/types";
import { createStarfieldRuntimeState } from "@/lib/motion/background/state";
import { readStarfieldTokens } from "@/lib/motion/background/tokens";
import type {
  BackgroundQualityLevel,
  StarfieldRendererConfig,
} from "@/lib/motion/background/types";

export function BackgroundStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    });
    if (!context) {
      return;
    }

    const reducedMotionMedia = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const fineHoverMedia = window.matchMedia("(pointer: fine) and (hover: hover)");
    const saveData = getConnectionSaveData();

    let renderer: StarfieldRenderer | null = null;
    let unmounted = false;

    const state = createStarfieldRuntimeState({
      reducedMotion: reducedMotionMedia.matches,
      fineHover: fineHoverMedia.matches,
      saveData,
      tokens: readStarfieldTokens(),
    });

    const getRendererConfig = (): StarfieldRendererConfig => ({
      quality: state.quality,
      reducedMotion: state.reducedMotion,
      fineHover: state.fineHover,
      tokens: state.tokens,
    });

    const draw = (timestamp: number) => {
      renderer?.render({
        timestamp,
        pointerX: state.pointerX,
        pointerY: state.pointerY,
        pointerVisible: state.pointerVisible,
      });
    };

    const refreshCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      state.width = Math.max(1, Math.round(rect.width));
      state.height = Math.max(1, Math.round(rect.height));

      const nextDprCap = state.reducedMotion
        ? 1
        : QUALITY_PRESET[state.quality].dprCap;
      state.dpr = clamp(window.devicePixelRatio || 1, 1, nextDprCap);

      renderer?.updateConfig(getRendererConfig());
      renderer?.resize({
        width: state.width,
        height: state.height,
        dpr: state.dpr,
      });
      state.lastDrawAt = 0;
      draw(performance.now());
    };

    const setQuality = (
      nextQuality: BackgroundQualityLevel,
      timestamp: number,
    ) => {
      if (nextQuality === state.quality) {
        return;
      }

      state.quality = nextQuality;
      state.frameIntervalMs = 1000 / QUALITY_PRESET[nextQuality].fps;
      state.qualityLockedUntil = timestamp + (nextQuality === "high" ? 9000 : 2600);
      state.degradeScore = 0;
      state.recoverScore = 0;
      refreshCanvas();
    };

    const updateQuality = (timestamp: number) => {
      if (state.reducedMotion || state.saveData) {
        return;
      }

      if (timestamp < state.qualityLockedUntil) {
        return;
      }

      const degradeThreshold = getDegradeThreshold(state.quality);
      const upgradeThreshold = getUpgradeThreshold(state.quality);

      if (state.emaFrameDelta > degradeThreshold) {
        state.degradeScore += 1;
      } else {
        state.degradeScore = Math.max(0, state.degradeScore - 2);
      }

      if (upgradeThreshold > 0 && state.emaFrameDelta < upgradeThreshold) {
        state.recoverScore += 1;
      } else {
        state.recoverScore = Math.max(0, state.recoverScore - 1);
      }

      if (state.degradeScore > 110) {
        setQuality(lowerQuality(state.quality), timestamp);
        return;
      }

      if (state.recoverScore > 640) {
        setQuality(higherQuality(state.quality), timestamp);
      }
    };

    const loop = (timestamp: number) => {
      if (!state.running) {
        state.rafId = 0;
        return;
      }

      state.rafId = window.requestAnimationFrame(loop);

      if (!state.lastRafAt) {
        state.lastRafAt = timestamp;
      } else {
        const delta = timestamp - state.lastRafAt;
        state.lastRafAt = timestamp;
        state.emaFrameDelta = state.emaFrameDelta * 0.9 + delta * 0.1;
        updateQuality(timestamp);
      }

      if (timestamp - state.lastDrawAt < state.frameIntervalMs) {
        return;
      }

      state.lastDrawAt = timestamp;
      draw(timestamp);
    };

    const stopLoop = () => {
      state.running = false;
      if (state.rafId) {
        window.cancelAnimationFrame(state.rafId);
      }
      state.rafId = 0;
    };

    const startLoop = () => {
      if (state.running || state.reducedMotion || document.hidden || !renderer) {
        return;
      }
      state.running = true;
      state.lastRafAt = 0;
      state.lastDrawAt = 0;
      state.rafId = window.requestAnimationFrame(loop);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!state.fineHover || state.reducedMotion) {
        return;
      }
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
      state.pointerVisible = true;
    };

    const handlePointerLeave = () => {
      state.pointerVisible = false;
    };

    const handlePointerOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        handlePointerLeave();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopLoop();
        return;
      }

      if (state.reducedMotion) {
        draw(performance.now());
        return;
      }

      startLoop();
    };

    const handleMediaUpdate = () => {
      state.reducedMotion = reducedMotionMedia.matches;
      state.fineHover = fineHoverMedia.matches;
      state.pointerVisible = false;
      state.tokens = readStarfieldTokens();

      if (state.saveData && state.quality !== "low") {
        state.quality = "low";
        state.frameIntervalMs = 1000 / QUALITY_PRESET.low.fps;
      }

      refreshCanvas();

      if (state.reducedMotion) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    const handleThemeChange = () => {
      state.tokens = readStarfieldTokens();
      renderer?.updateConfig(getRendererConfig());
      draw(performance.now());
    };

    const mediaCleanup = [
      (() => {
        const handler = () => handleMediaUpdate();
        reducedMotionMedia.addEventListener("change", handler);
        return () => reducedMotionMedia.removeEventListener("change", handler);
      })(),
      (() => {
        const handler = () => handleMediaUpdate();
        fineHoverMedia.addEventListener("change", handler);
        return () => fineHoverMedia.removeEventListener("change", handler);
      })(),
    ];

    const themeObserver = new MutationObserver(handleThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    window.addEventListener("resize", refreshCanvas, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("mouseout", handlePointerOut, { passive: true });
    window.addEventListener("blur", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    void (async () => {
      const nextRenderer = await createStarfieldRenderer({
        canvas,
        context,
        initialConfig: getRendererConfig(),
      });

      if (unmounted) {
        nextRenderer.dispose();
        return;
      }

      renderer = nextRenderer;
      refreshCanvas();
      if (!state.reducedMotion) {
        startLoop();
      }
    })();

    return () => {
      unmounted = true;
      stopLoop();
      mediaCleanup.forEach((cleanup) => cleanup());
      themeObserver.disconnect();
      window.removeEventListener("resize", refreshCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("mouseout", handlePointerOut);
      window.removeEventListener("blur", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      renderer?.dispose();
      renderer = null;
    };
  }, []);

  return (
    <div className="ambient-starfield" aria-hidden="true">
      <canvas ref={canvasRef} className="ambient-starfield-canvas" />
    </div>
  );
}
