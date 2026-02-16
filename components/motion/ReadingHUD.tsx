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
    let targetX = 12;
    let targetY = 40;
    let currentX = targetX;
    let currentY = targetY;
    let velocityX = 0;
    let velocityY = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let targetProgressLeft = 8;
    let currentProgressLeft = targetProgressLeft;
    let targetProgressWidth = window.innerWidth <= 768 ? 54 : 72;
    let currentProgressWidth = targetProgressWidth;
    let animationFrameId = 0;
    let scheduleFrameId = 0;

    const render = () => {
      marker.style.opacity = activeAnchor ? "1" : "0";
      marker.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      root.style.setProperty("--reading-hud-progress", currentProgress.toFixed(4));
      root.style.setProperty(
        "--reading-hud-progress-left",
        `${currentProgressLeft.toFixed(1)}px`,
      );
      root.style.setProperty(
        "--reading-hud-progress-width",
        `${currentProgressWidth.toFixed(1)}px`,
      );
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
      const markerOffset = isMobile ? 16 : 22;
      const edgePadding = 6;
      const dotRadius = isMobile ? 3 : 3.5;
      const markerMinX = edgePadding + dotRadius;
      const markerMaxX = window.innerWidth - edgePadding - dotRadius;
      const leftGutter = Math.max(0, scopeRect.left);
      const rightGutter = Math.max(0, window.innerWidth - scopeRect.right);
      const canUseLeft = leftGutter >= markerOffset + dotRadius;
      const canUseRight = rightGutter >= markerOffset + dotRadius;

      let side: "left" | "right";
      if (canUseRight && canUseLeft) {
        side = rightGutter >= leftGutter ? "right" : "left";
      } else if (canUseRight) {
        side = "right";
      } else {
        side = "left";
      }

      const markerColumn =
        side === "right" ? scopeRect.right + markerOffset : scopeRect.left - markerOffset;

      targetX = clamp(Math.round(markerColumn), markerMinX, markerMaxX);
      targetY = clamp(Math.round(anchorRect.top), 12, window.innerHeight - 12);

      const preferredProgressWidth = isMobile ? 54 : 72;
      const availableGutter = side === "right" ? rightGutter : leftGutter;
      const maxProgressWidth = Math.max(4, Math.round(availableGutter - 2));
      targetProgressWidth = Math.min(preferredProgressWidth, maxProgressWidth);

      const progressLeftBase =
        side === "right"
          ? scopeRect.right + 2
          : scopeRect.left - targetProgressWidth - 2;
      targetProgressLeft = clamp(
        Math.round(progressLeftBase),
        0,
        Math.max(0, window.innerWidth - targetProgressWidth),
      );
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
        currentProgressLeft = targetProgressLeft;
        currentProgressWidth = targetProgressWidth;
        render();
        return;
      }

      const spring = 0.18;
      const damping = 0.72;
      const progressFollow = 0.2;
      const hudFollow = 0.24;
      const hudWidthFollow = 0.28;

      velocityX = (velocityX + (targetX - currentX) * spring) * damping;
      velocityY = (velocityY + (targetY - currentY) * spring) * damping;
      currentX += velocityX;
      currentY += velocityY;
      currentProgress += (targetProgress - currentProgress) * progressFollow;
      currentProgressLeft += (targetProgressLeft - currentProgressLeft) * hudFollow;
      currentProgressWidth +=
        (targetProgressWidth - currentProgressWidth) * hudWidthFollow;
      render();

      const stillMoving =
        Math.abs(targetX - currentX) > 0.16 ||
        Math.abs(targetY - currentY) > 0.16 ||
        Math.abs(targetProgress - currentProgress) > 0.002 ||
        Math.abs(targetProgressLeft - currentProgressLeft) > 0.24 ||
        Math.abs(targetProgressWidth - currentProgressWidth) > 0.24 ||
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
        currentProgressLeft = targetProgressLeft;
        currentProgressWidth = targetProgressWidth;
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

    window.addEventListener("scroll", scheduleRefresh, { passive: true });
    window.addEventListener("resize", scheduleRefresh);

    refreshTargets();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleRefresh);
      window.removeEventListener("resize", scheduleRefresh);

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
      <div className="reading-hud-progress">
        <span className="reading-hud-progress-fill" />
      </div>
      <div ref={markerRef} className="reading-hud-marker">
        <span className="reading-hud-marker-rail" />
        <span className="reading-hud-marker-dot" />
      </div>
    </div>
  );
}
