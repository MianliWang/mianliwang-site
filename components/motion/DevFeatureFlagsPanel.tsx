"use client";

import { useMotion } from "@/components/motion/MotionProvider";
import type { MotionFeature, MotionQualityMode } from "@/lib/feature-flags";

const QUALITY_MODES: MotionQualityMode[] = ["auto", "high", "medium", "low", "off"];

function FeatureSwitch({
  label,
  feature,
}: {
  label: string;
  feature: MotionFeature;
}) {
  const { features, setFeature, pointer, readingGuideActive } = useMotion();
  const enabled = features[feature];

  const activeLabel =
    feature === "cursor"
      ? pointer.cursorActive
      : feature === "spotlight"
        ? pointer.spotlightActive
        : readingGuideActive;

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFeature(feature, !enabled)}
          className="rounded-full border border-surface-border px-2 py-1 text-[11px] font-medium transition-colors hover:border-accent"
        >
          {enabled ? "ON" : "OFF"}
        </button>
        <span
          className={`rounded-full px-2 py-1 text-[10px] ${
            activeLabel ? "bg-accent/15 text-accent" : "bg-muted/15 text-muted"
          }`}
        >
          {activeLabel ? "active" : "inactive"}
        </span>
      </div>
    </div>
  );
}

export function DevFeatureFlagsPanel() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <DevFeatureFlagsPanelInner />;
}

function DevFeatureFlagsPanelInner() {
  const { qualityMode, effectiveQuality, qualityReason, setQualityMode, perf } =
    useMotion();

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[290px] rounded-xl border border-surface-border bg-surface/95 p-3 text-xs shadow-sm backdrop-blur-sm">
      <p className="font-semibold tracking-wide text-foreground">Motion Dev Panel</p>
      <p className="mt-1 text-[11px] text-muted">
        FPS {perf.fps.toFixed(1)} | {perf.avgFrameMs.toFixed(2)}ms
      </p>
      <p className="mt-1 text-[11px] text-muted">
        Quality {effectiveQuality.toUpperCase()} ({qualityMode.toUpperCase()})
      </p>
      <p className="mt-1 text-[11px] text-muted">Reason: {qualityReason}</p>

      <div className="mt-3 grid grid-cols-5 gap-1">
        {QUALITY_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setQualityMode(mode)}
            className={`rounded-md border px-1 py-1 text-[10px] font-medium uppercase transition-colors ${
              qualityMode === mode
                ? "border-accent bg-accent/15 text-accent"
                : "border-surface-border text-muted"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="mt-3 border-t border-surface-border pt-2">
        <FeatureSwitch label="Cursor" feature="cursor" />
        <FeatureSwitch label="Spotlight" feature="spotlight" />
        <FeatureSwitch label="Reading Guide" feature="readingGuide" />
      </div>
    </aside>
  );
}
