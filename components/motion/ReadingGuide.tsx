"use client";

import { useMotion } from "@/components/motion/MotionProvider";
import { useEffect, useRef } from "react";

type ReadingGuideProps = {
  scopeId: string;
  itemSelector?: string;
};

type AnchorMeta = {
  isIntersecting: boolean;
  top: number;
  ratio: number;
};

export function ReadingGuide({
  scopeId,
  itemSelector = "[data-reading-anchor]",
}: ReadingGuideProps) {
  const { readingGuideActive, effectiveQuality } = useMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const dot = dotRef.current;
    const scope = document.getElementById(scopeId);
    if (!root || !dot || !scope || !readingGuideActive) {
      if (dot) {
        dot.style.opacity = "0";
      }
      return;
    }

    const anchors = Array.from(
      scope.querySelectorAll(itemSelector),
    ) as HTMLElement[];
    if (anchors.length === 0) {
      dot.style.opacity = "0";
      return;
    }

    const metas = new Map<HTMLElement, AnchorMeta>();
    let activeAnchor: HTMLElement | null = anchors[0];
    let frameId = 0;

    const allowDotAnimation = effectiveQuality === "high" || effectiveQuality === "medium";
    dot.style.transition = allowDotAnimation
      ? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease"
      : "none";

    const updateProgress = () => {
      const scrollRoot = document.documentElement;
      const maxScroll = scrollRoot.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      root.style.setProperty("--reading-progress", progress.toFixed(4));
    };

    const updateDotPosition = () => {
      if (!activeAnchor || !activeAnchor.isConnected) {
        dot.style.opacity = "0";
        return;
      }

      const scopeRect = scope.getBoundingClientRect();
      const anchorRect = activeAnchor.getBoundingClientRect();
      const x = Math.max(12, scopeRect.left - 16);
      const y = Math.min(
        window.innerHeight - 12,
        Math.max(12, Math.round(anchorRect.top)),
      );

      dot.style.opacity = "1";
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
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

        const score = Math.abs(meta.top - focusY) + (1 - meta.ratio) * 80;
        if (score < minScore) {
          minScore = score;
          nextActive = anchor;
        }
      }

      if (nextActive) {
        activeAnchor = nextActive;
      }
    };

    const updateAll = () => {
      frameId = 0;
      updateProgress();
      updateDotPosition();
    };

    const scheduleUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateAll);
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

        pickActiveAnchor();
        updateDotPosition();
        scheduleUpdate();
      },
      {
        root: null,
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.1, 0.35, 0.6, 1],
      },
    );

    for (const anchor of anchors) {
      observer.observe(anchor);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    updateProgress();
    updateDotPosition();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [effectiveQuality, itemSelector, readingGuideActive, scopeId]);

  if (!readingGuideActive) {
    return null;
  }

  return (
    <div ref={rootRef} className="reading-guide-root" aria-hidden="true">
      <div className="reading-guide-progress-track">
        <span className="reading-guide-progress-fill" />
      </div>
      <span ref={dotRef} className="reading-guide-dot" />
    </div>
  );
}
