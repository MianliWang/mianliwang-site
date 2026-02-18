"use client";

import { useMotion } from "@/components/motion/MotionProvider";
import { useEffect, useRef } from "react";

type ReadingHUDProps = {
  scopeId: string;
  itemSelector?: string;
};

type AnchorMeta = {
  isIntersecting: boolean;
  top: number;
  ratio: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readMainGutterPx() {
  const main = document.getElementById("main-content");
  if (!main) {
    return 16;
  }

  const style = window.getComputedStyle(main);
  const parsed = Number.parseFloat(style.paddingLeft);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16;
}

export function ReadingHUD({
  scopeId,
  itemSelector = "[data-reading-anchor]",
}: ReadingHUDProps) {
  const { readingGuideActive, runtime } = useMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const marker = markerRef.current;
    const scope = document.getElementById(scopeId);
    if (!root || !marker || !scope || !readingGuideActive) {
      if (marker) {
        marker.style.opacity = "0";
      }
      return;
    }

    const anchors = Array.from(scope.querySelectorAll(itemSelector)) as HTMLElement[];
    if (anchors.length === 0) {
      marker.style.opacity = "0";
      return;
    }

    const reducedMotion = runtime.reducedMotion;
    const metas = new Map<HTMLElement, AnchorMeta>();

    let activeAnchor: HTMLElement | null = anchors[0] ?? null;
    let targetX = 24;
    let targetY = 40;
    let currentX = targetX;
    let currentY = targetY;
    let velocityX = 0;
    let velocityY = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let targetRulerLeft = 24;
    let currentRulerLeft = targetRulerLeft;
    let animationFrameId = 0;
    let scheduleFrameId = 0;
    let mainGutterPx = readMainGutterPx();

    const render = () => {
      marker.style.opacity = activeAnchor ? "1" : "0";
      marker.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      root.style.setProperty("--reading-hud-progress", currentProgress.toFixed(4));
      root.style.setProperty("--reading-hud-ruler-left", `${currentRulerLeft.toFixed(1)}px`);
    };

    const updateProgressTarget = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      targetProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    };

    const updateMarkerTarget = () => {
      if (!activeAnchor || !activeAnchor.isConnected) {
        return;
      }

      const scopeRect = scope.getBoundingClientRect();
      const anchorRect = activeAnchor.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      const rulerOffset = isMobile
        ? clamp(mainGutterPx * 0.66, 10, 14)
        : clamp(mainGutterPx * 0.9, 14, 26);
      const edgePadding = isMobile ? 6 : 8;
      const dotRadius = isMobile ? 3 : 3.5;
      const rulerMinX = edgePadding + dotRadius;
      const rulerMaxX = window.innerWidth - edgePadding - dotRadius;
      const markerMinX = edgePadding + dotRadius;
      const markerMaxX = window.innerWidth - edgePadding - dotRadius;
      const hudTop = isMobile ? 84 : 102;
      const hudBottom = window.innerHeight - (isMobile ? 14 : 18);

      targetRulerLeft = clamp(
        Math.round(scopeRect.left - rulerOffset),
        rulerMinX,
        rulerMaxX,
      );
      targetX = clamp(targetRulerLeft, markerMinX, markerMaxX);
      targetY = clamp(Math.round(anchorRect.top), hudTop, hudBottom);
    };

    const pickActiveAnchor = () => {
      const focusY = window.innerHeight * 0.24;
      let nextActive: HTMLElement | null = null;
      let minScore = Number.POSITIVE_INFINITY;

      for (const anchor of anchors) {
        const meta = metas.get(anchor);
        if (!meta?.isIntersecting) {
          continue;
        }

        const score = Math.abs(meta.top - focusY) + (1 - meta.ratio) * 90;
        if (score < minScore) {
          minScore = score;
          nextActive = anchor;
        }
      }

      if (nextActive) {
        activeAnchor = nextActive;
      }
    };

    const stopAnimation = () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    const animate = () => {
      animationFrameId = 0;

      if (reducedMotion) {
        currentX = targetX;
        currentY = targetY;
        currentProgress = targetProgress;
        currentRulerLeft = targetRulerLeft;
        render();
        return;
      }

      const spring = 0.18;
      const damping = 0.72;
      const progressFollow = 0.2;
      const hudFollow = 0.24;

      velocityX = (velocityX + (targetX - currentX) * spring) * damping;
      velocityY = (velocityY + (targetY - currentY) * spring) * damping;
      currentX += velocityX;
      currentY += velocityY;
      currentProgress += (targetProgress - currentProgress) * progressFollow;
      currentRulerLeft += (targetRulerLeft - currentRulerLeft) * hudFollow;
      render();

      const stillMoving =
        Math.abs(targetX - currentX) > 0.16 ||
        Math.abs(targetY - currentY) > 0.16 ||
        Math.abs(targetProgress - currentProgress) > 0.002 ||
        Math.abs(targetRulerLeft - currentRulerLeft) > 0.24 ||
        Math.abs(velocityX) > 0.05 ||
        Math.abs(velocityY) > 0.05;

      if (stillMoving) {
        animationFrameId = window.requestAnimationFrame(animate);
      }
    };

    const ensureAnimation = () => {
      if (animationFrameId) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(animate);
    };

    const refreshTargets = () => {
      updateProgressTarget();
      pickActiveAnchor();
      updateMarkerTarget();

      if (reducedMotion) {
        stopAnimation();
        currentX = targetX;
        currentY = targetY;
        currentProgress = targetProgress;
        currentRulerLeft = targetRulerLeft;
        render();
        return;
      }

      ensureAnimation();
    };

    const scheduleRefresh = () => {
      if (scheduleFrameId) {
        return;
      }

      scheduleFrameId = window.requestAnimationFrame(() => {
        scheduleFrameId = 0;
        refreshTargets();
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          metas.set(entry.target as HTMLElement, {
            isIntersecting: entry.isIntersecting,
            top: entry.boundingClientRect.top,
            ratio: entry.intersectionRatio,
          });
        }

        scheduleRefresh();
      },
      {
        root: null,
        rootMargin: "-16% 0px -62% 0px",
        threshold: [0, 0.15, 0.35, 0.55, 0.8, 1],
      },
    );

    for (const anchor of anchors) {
      observer.observe(anchor);
    }

    const handleResize = () => {
      mainGutterPx = readMainGutterPx();
      scheduleRefresh();
    };

    window.addEventListener("scroll", scheduleRefresh, { passive: true });
    window.addEventListener("resize", handleResize);

    refreshTargets();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleRefresh);
      window.removeEventListener("resize", handleResize);

      if (scheduleFrameId) {
        window.cancelAnimationFrame(scheduleFrameId);
      }
      stopAnimation();
    };
  }, [itemSelector, readingGuideActive, runtime.reducedMotion, scopeId]);

  if (!readingGuideActive) {
    return null;
  }

  return (
    <div ref={rootRef} className="reading-hud-root" aria-hidden="true">
      <div className="reading-hud-ruler">
        <span className="reading-hud-ruler-fill" />
      </div>
      <div ref={markerRef} className="reading-hud-marker">
        <span className="reading-hud-marker-rail" />
        <span className="reading-hud-marker-dot" />
      </div>
    </div>
  );
}
