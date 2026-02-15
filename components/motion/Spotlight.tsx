"use client";

import { useMotion } from "@/components/motion/MotionProvider";
import { subscribePointerFrames } from "@/lib/motion/pointer-runtime";
import { useEffect, useRef } from "react";

type SpotlightState = {
  initialized: boolean;
  x: number;
  y: number;
  opacity: number;
};

export function Spotlight() {
  const { pointer, effectiveQuality } = useMotion();
  const spotlightRef = useRef<HTMLDivElement>(null);
  const spotlightStateRef = useRef<SpotlightState>({
    initialized: false,
    x: 0,
    y: 0,
    opacity: 0,
  });

  const enabled = pointer.spotlightActive;

  useEffect(() => {
    if (!enabled) {
      const element = spotlightRef.current;
      if (element) {
        element.style.setProperty("--spotlight-opacity", "0");
      }
      spotlightStateRef.current.initialized = false;
      spotlightStateRef.current.opacity = 0;
      return;
    }

    const element = spotlightRef.current;
    if (!element) {
      return;
    }

    const followFactor = effectiveQuality === "medium" ? 0.12 : 0.16;
    const fadeFactor = effectiveQuality === "medium" ? 0.09 : 0.12;
    const intensity = effectiveQuality === "medium" ? 0.82 : 1;

    const unsubscribe = subscribePointerFrames((frame) => {
      const spotlightState = spotlightStateRef.current;

      if (!spotlightState.initialized) {
        spotlightState.initialized = true;
        spotlightState.x = frame.pointerX;
        spotlightState.y = frame.pointerY;
      }

      spotlightState.x += (frame.pointerX - spotlightState.x) * followFactor;
      spotlightState.y += (frame.pointerY - spotlightState.y) * followFactor;

      const targetOpacity = frame.visible ? intensity : 0;
      spotlightState.opacity += (targetOpacity - spotlightState.opacity) * fadeFactor;

      element.style.setProperty("--spotlight-x", `${spotlightState.x}px`);
      element.style.setProperty("--spotlight-y", `${spotlightState.y}px`);
      element.style.setProperty(
        "--spotlight-opacity",
        spotlightState.opacity.toFixed(3),
      );
    });

    return () => {
      unsubscribe();
      element.style.setProperty("--spotlight-opacity", "0");
    };
  }, [enabled, effectiveQuality]);

  return (
    <div ref={spotlightRef} className="spotlight-layer" aria-hidden="true">
      <div className="spotlight-glow" />
      <div className="spotlight-noise" />
    </div>
  );
}
