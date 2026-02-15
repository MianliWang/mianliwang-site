export const MOTION_SETTINGS_EVENT = "motion-settings:changed";

const FEATURE_KEYS = {
  cursor: "motion.feature.cursor.enabled",
  spotlight: "motion.feature.spotlight.enabled",
  readingGuide: "motion.feature.reading-guide.enabled",
} as const;

const QUALITY_MODE_KEY = "motion.quality.mode";

export type MotionFeature = keyof typeof FEATURE_KEYS;
export type MotionQualityMode = "auto" | "high" | "medium" | "low" | "off";
export type MotionQuality = Exclude<MotionQualityMode, "auto">;

function isBrowser() {
  return typeof window !== "undefined";
}

function dispatchSettingsChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(MOTION_SETTINGS_EVENT));
}

export function isFeatureEnabled(feature: MotionFeature): boolean {
  if (!isBrowser()) {
    return true;
  }

  return window.localStorage.getItem(FEATURE_KEYS[feature]) !== "0";
}

export function setFeatureEnabled(feature: MotionFeature, enabled: boolean) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(FEATURE_KEYS[feature], enabled ? "1" : "0");
  dispatchSettingsChange();
}

function isMotionQualityMode(value: string | null): value is MotionQualityMode {
  return (
    value === "auto" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "off"
  );
}

export function getMotionQualityMode(): MotionQualityMode {
  if (!isBrowser()) {
    return "auto";
  }

  const value = window.localStorage.getItem(QUALITY_MODE_KEY);
  if (!isMotionQualityMode(value)) {
    return "auto";
  }

  return value;
}

export function setMotionQualityMode(mode: MotionQualityMode) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(QUALITY_MODE_KEY, mode);
  dispatchSettingsChange();
}

export function subscribeMotionSettings(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener(MOTION_SETTINGS_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(MOTION_SETTINGS_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}
