"use client";

import { useMotion } from "@/components/motion/MotionProvider";
import { subscribePointerFrames, type PointerFrame } from "@/lib/motion/pointer-runtime";
import { useEffect, useRef } from "react";

type CursorPhysics = {
  initialized: boolean;
  coreX: number;
  coreY: number;
  haloX: number;
  haloY: number;
  coreVx: number;
  coreVy: number;
  haloVx: number;
  haloVy: number;
};

function renderCursorFrame(
  frame: PointerFrame,
  core: HTMLDivElement,
  halo: HTMLDivElement,
  physics: CursorPhysics,
  quality: "high" | "medium" | "low" | "off",
) {
  if (!physics.initialized) {
    physics.initialized = true;
    physics.coreX = frame.pointerX;
    physics.coreY = frame.pointerY;
    physics.haloX = frame.pointerX;
    physics.haloY = frame.pointerY;
  }

  const activeElement =
    frame.interactiveElement && frame.interactiveElement.isConnected
      ? frame.interactiveElement
      : null;

  const isLow = quality === "low";
  const isMedium = quality === "medium";

  let targetX = frame.pointerX;
  let targetY = frame.pointerY;
  let coreScale = 1;
  let haloScale = isLow ? 0.9 : 1;
  let haloOpacity = isLow ? 0.08 : 0.2;

  if (activeElement) {
    const rect = activeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const snapFactor = isLow ? 0.12 : isMedium ? 0.2 : 0.28;
    targetX = frame.pointerX + (centerX - frame.pointerX) * snapFactor;
    targetY = frame.pointerY + (centerY - frame.pointerY) * snapFactor;

    if (frame.interactiveKind === "card") {
      coreScale = isLow ? 1.08 : isMedium ? 1.12 : 1.15;
      haloScale = isLow ? 1.1 : isMedium ? 1.9 : 2.35;
      haloOpacity = isLow ? 0.1 : isMedium ? 0.14 : 0.17;
    } else {
      coreScale = isLow ? 1.2 : isMedium ? 1.28 : 1.4;
      haloScale = isLow ? 1.25 : isMedium ? 1.55 : 1.85;
      haloOpacity = isLow ? 0.12 : isMedium ? 0.18 : 0.26;
    }
  }

  if (frame.pressed) {
    coreScale *= 0.9;
    haloScale *= 0.94;
  }

  const coreFollow = isLow ? 0.22 : isMedium ? 0.24 : 0.26;
  const coreDamping = isLow ? 0.64 : 0.62;
  physics.coreVx += (targetX - physics.coreX) * coreFollow;
  physics.coreVy += (targetY - physics.coreY) * coreFollow;
  physics.coreVx *= coreDamping;
  physics.coreVy *= coreDamping;
  physics.coreX += physics.coreVx;
  physics.coreY += physics.coreVy;

  const haloFollow = isLow ? 0.09 : isMedium ? 0.1 : 0.12;
  const haloDamping = isLow ? 0.76 : 0.72;
  physics.haloVx += (targetX - physics.haloX) * haloFollow;
  physics.haloVy += (targetY - physics.haloY) * haloFollow;
  physics.haloVx *= haloDamping;
  physics.haloVy *= haloDamping;
  physics.haloX += physics.haloVx;
  physics.haloY += physics.haloVy;

  core.style.transform = `translate3d(${physics.coreX}px, ${physics.coreY}px, 0) translate(-50%, -50%) scale(${coreScale})`;
  core.style.opacity = frame.visible ? "1" : "0";

  halo.style.transform = `translate3d(${physics.haloX}px, ${physics.haloY}px, 0) translate(-50%, -50%) scale(${haloScale})`;
  halo.style.opacity = frame.visible ? `${haloOpacity}` : "0";
}

export function Cursor() {
  const { pointer, effectiveQuality } = useMotion();
  const coreRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<CursorPhysics>({
    initialized: false,
    coreX: 0,
    coreY: 0,
    haloX: 0,
    haloY: 0,
    coreVx: 0,
    coreVy: 0,
    haloVx: 0,
    haloVy: 0,
  });

  const enabled = pointer.cursorActive;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("custom-cursor-enabled", enabled);

    if (!enabled) {
      const core = coreRef.current;
      const halo = haloRef.current;
      if (core) {
        core.style.opacity = "0";
      }
      if (halo) {
        halo.style.opacity = "0";
      }
      physicsRef.current.initialized = false;
    }

    return () => {
      root.classList.remove("custom-cursor-enabled");
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) {
      return;
    }

    const unsubscribe = subscribePointerFrames((frame) => {
      renderCursorFrame(frame, core, halo, physicsRef.current, effectiveQuality);
    });

    return () => {
      unsubscribe();
      core.style.opacity = "0";
      halo.style.opacity = "0";
    };
  }, [enabled, effectiveQuality]);

  return (
    <>
      <div ref={haloRef} aria-hidden="true" className="cursor-halo" />
      <div ref={coreRef} aria-hidden="true" className="cursor-core" />
    </>
  );
}
