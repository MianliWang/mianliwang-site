"use client";

import {
  getMotionQualityMode,
  isFeatureEnabled,
  setFeatureEnabled,
  setMotionQualityMode,
  subscribeMotionSettings,
  type MotionFeature,
  type MotionQuality,
  type MotionQualityMode,
} from "@/lib/feature-flags";
import {
  getPointerRuntimeState,
  setPointerChannelActive,
  subscribePointerFrames,
  subscribePointerRuntimeState,
} from "@/lib/motion/pointer-runtime";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type MotionFeatureState = Record<MotionFeature, boolean>;
type AutoAdaptiveQuality = "high" | "medium" | "low";
type PointerRuntimeState = ReturnType<typeof getPointerRuntimeState>;

type MotionContextValue = {
  runtime: {
    fineHover: boolean;
    reducedMotion: boolean;
    motionAllowed: boolean;
  };
  features: MotionFeatureState;
  qualityMode: MotionQualityMode;
  autoQuality: MotionQuality;
  effectiveQuality: MotionQuality;
  qualityReason: string;
  perf: {
    fps: number;
    avgFrameMs: number;
  };
  pointer: {
    cursorActive: boolean;
    spotlightActive: boolean;
  };
  readingGuideActive: boolean;
  setFeature: (feature: MotionFeature, enabled: boolean) => void;
  setQualityMode: (mode: MotionQualityMode) => void;
};

const MotionContext = createContext<MotionContextValue | null>(null);

const serverRuntimeState: PointerRuntimeState = {
  fineHover: false,
  reducedMotion: false,
  motionAllowed: false,
};

const MOTION_QUALITY_ORDER: AutoAdaptiveQuality[] = ["low", "medium", "high"];
const AUTO_DEGRADE_THRESHOLD: Record<AutoAdaptiveQuality, number> = {
  high: 21.5,
  medium: 27,
  low: 33,
};
const AUTO_UPGRADE_THRESHOLD: Record<AutoAdaptiveQuality, number> = {
  high: 0,
  medium: 16.2,
  low: 21.5,
};

function lowerQuality(current: AutoAdaptiveQuality): AutoAdaptiveQuality {
  const index = MOTION_QUALITY_ORDER.indexOf(current);
  if (index <= 0) {
    return current;
  }

  return MOTION_QUALITY_ORDER[index - 1];
}

function higherQuality(current: AutoAdaptiveQuality): AutoAdaptiveQuality {
  const index = MOTION_QUALITY_ORDER.indexOf(current);
  if (index >= MOTION_QUALITY_ORDER.length - 1) {
    return current;
  }

  return MOTION_QUALITY_ORDER[index + 1];
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const cursorEnabled = useSyncExternalStore<boolean>(
    subscribeMotionSettings,
    () => isFeatureEnabled("cursor"),
    () => true,
  );
  const spotlightEnabled = useSyncExternalStore<boolean>(
    subscribeMotionSettings,
    () => isFeatureEnabled("spotlight"),
    () => true,
  );
  const readingGuideEnabled = useSyncExternalStore<boolean>(
    subscribeMotionSettings,
    () => isFeatureEnabled("readingGuide"),
    () => true,
  );
  const qualityMode = useSyncExternalStore<MotionQualityMode>(
    subscribeMotionSettings,
    getMotionQualityMode,
    () => "auto" as MotionQualityMode,
  );

  const runtime = useSyncExternalStore<PointerRuntimeState>(
    subscribePointerRuntimeState,
    getPointerRuntimeState,
    () => serverRuntimeState,
  );

  const [autoQuality, setAutoQuality] = useState<AutoAdaptiveQuality>("high");
  const [autoReason, setAutoReason] = useState("auto-stable");
  const [perf, setPerf] = useState({
    fps: 0,
    avgFrameMs: 0,
  });

  const effectiveQuality: MotionQuality =
    qualityMode === "auto" ? autoQuality : qualityMode;

  const pointerSupported = runtime.fineHover && !runtime.reducedMotion;
  const cursorActive =
    pointerSupported && cursorEnabled && effectiveQuality !== "off";
  const spotlightActive =
    pointerSupported &&
    spotlightEnabled &&
    (effectiveQuality === "high" || effectiveQuality === "medium");
  const readingGuideActive =
    pointerSupported && readingGuideEnabled && effectiveQuality !== "off";

  useEffect(() => {
    setPointerChannelActive("cursor", cursorActive);
    return () => {
      setPointerChannelActive("cursor", false);
    };
  }, [cursorActive]);

  useEffect(() => {
    setPointerChannelActive("spotlight", spotlightActive);
    return () => {
      setPointerChannelActive("spotlight", false);
    };
  }, [spotlightActive]);

  const qualityModeRef = useRef<MotionQualityMode>(qualityMode);
  const autoQualityRef = useRef<AutoAdaptiveQuality>(autoQuality);
  const pointerWorkActiveRef = useRef(false);

  useEffect(() => {
    qualityModeRef.current = qualityMode;
  }, [qualityMode]);

  useEffect(() => {
    autoQualityRef.current = autoQuality;
  }, [autoQuality]);

  useEffect(() => {
    pointerWorkActiveRef.current = cursorActive || spotlightActive;
  }, [cursorActive, spotlightActive]);

  useEffect(() => {
    const perfState = {
      lastTimestamp: 0,
      emaFrameMs: 16.7,
      degradedStreak: 0,
      recoveredStreak: 0,
      lastQualityChangeAt: 0,
      lastUiPublishAt: 0,
    };

    const unsubscribe = subscribePointerFrames((frame) => {
      if (!pointerWorkActiveRef.current) {
        perfState.lastTimestamp = frame.timestamp;
        return;
      }

      if (!perfState.lastTimestamp) {
        perfState.lastTimestamp = frame.timestamp;
        return;
      }

      const delta = Math.max(
        8,
        Math.min(70, frame.timestamp - perfState.lastTimestamp),
      );
      perfState.lastTimestamp = frame.timestamp;

      perfState.emaFrameMs = perfState.emaFrameMs * 0.9 + delta * 0.1;

      if (frame.timestamp - perfState.lastUiPublishAt > 300) {
        perfState.lastUiPublishAt = frame.timestamp;
        setPerf({
          fps: Number((1000 / perfState.emaFrameMs).toFixed(1)),
          avgFrameMs: Number(perfState.emaFrameMs.toFixed(2)),
        });
      }

      if (qualityModeRef.current !== "auto") {
        perfState.degradedStreak = 0;
        perfState.recoveredStreak = 0;
        return;
      }

      const now = frame.timestamp;
      const current = autoQualityRef.current;
      const degradeThreshold = AUTO_DEGRADE_THRESHOLD[current];
      const upgradeThreshold = AUTO_UPGRADE_THRESHOLD[current];

      if (perfState.emaFrameMs > degradeThreshold) {
        perfState.degradedStreak += 1;
      } else {
        perfState.degradedStreak = Math.max(0, perfState.degradedStreak - 2);
      }

      if (upgradeThreshold > 0 && perfState.emaFrameMs < upgradeThreshold) {
        perfState.recoveredStreak += 1;
      } else {
        perfState.recoveredStreak = Math.max(0, perfState.recoveredStreak - 1);
      }

      const canAdjust = now - perfState.lastQualityChangeAt > 2200;

      if (canAdjust && perfState.degradedStreak > 90) {
        const next = lowerQuality(current);
        if (next !== current) {
          perfState.lastQualityChangeAt = now;
          perfState.degradedStreak = 0;
          perfState.recoveredStreak = 0;
          setAutoQuality(next);
          setAutoReason(
            `auto-degrade ${current}->${next} (${perfState.emaFrameMs.toFixed(1)}ms avg)`,
          );
        }
        return;
      }

      const canUpgrade = now - perfState.lastQualityChangeAt > 9000;
      if (canUpgrade && perfState.recoveredStreak > 560) {
        const next = higherQuality(current);
        if (next !== current) {
          perfState.lastQualityChangeAt = now;
          perfState.degradedStreak = 0;
          perfState.recoveredStreak = 0;
          setAutoQuality(next);
          setAutoReason(
            `auto-upgrade ${current}->${next} (${perfState.emaFrameMs.toFixed(1)}ms avg)`,
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const qualityReason = useMemo(() => {
    if (!runtime.fineHover) {
      return "coarse/touch pointer";
    }
    if (runtime.reducedMotion) {
      return "prefers-reduced-motion";
    }
    if (qualityMode !== "auto") {
      return `manual-${qualityMode}`;
    }
    return autoReason;
  }, [autoReason, qualityMode, runtime.fineHover, runtime.reducedMotion]);

  const setFeature = useCallback(
    (feature: MotionFeature, enabled: boolean) => {
      setFeatureEnabled(feature, enabled);
    },
    [],
  );

  const setQualityMode = useCallback((mode: MotionQualityMode) => {
    setMotionQualityMode(mode);
  }, []);

  const displayedPerf = useMemo(
    () =>
      cursorActive || spotlightActive
        ? perf
        : {
            fps: 0,
            avgFrameMs: 0,
          },
    [cursorActive, spotlightActive, perf],
  );

  const value = useMemo<MotionContextValue>(
    () => ({
      runtime,
      features: {
        cursor: cursorEnabled,
        spotlight: spotlightEnabled,
        readingGuide: readingGuideEnabled,
      },
      qualityMode,
      autoQuality,
      effectiveQuality,
      qualityReason,
      perf: displayedPerf,
      pointer: {
        cursorActive,
        spotlightActive,
      },
      readingGuideActive,
      setFeature,
      setQualityMode,
    }),
    [
      runtime,
      cursorEnabled,
      spotlightEnabled,
      readingGuideEnabled,
      qualityMode,
      autoQuality,
      effectiveQuality,
      qualityReason,
      displayedPerf,
      cursorActive,
      spotlightActive,
      readingGuideActive,
      setFeature,
      setQualityMode,
    ],
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion() {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error("useMotion must be used within MotionProvider");
  }

  return context;
}
