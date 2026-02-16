export type InteractiveKind = "default" | "action" | "card";
export type PointerChannel = "cursor" | "spotlight";

export type PointerFrame = {
  pointerX: number;
  pointerY: number;
  visible: boolean;
  pressed: boolean;
  interactiveKind: InteractiveKind;
  interactiveElement: HTMLElement | null;
  timestamp: number;
};

type RuntimeState = {
  fineHover: boolean;
  reducedMotion: boolean;
  motionAllowed: boolean;
};

type FrameSubscriber = (frame: PointerFrame) => void;
type StateSubscriber = () => void;

const INTERACTIVE_SELECTOR = [
  '[data-cursor-interactive="action"]',
  '[data-cursor-interactive="card"]',
  "a[href]",
  "button",
  '[role="button"]',
].join(",");

const frameSubscribers = new Set<FrameSubscriber>();
const stateSubscribers = new Set<StateSubscriber>();

const activeChannels: Record<PointerChannel, boolean> = {
  cursor: false,
  spotlight: false,
};

const frame: PointerFrame = {
  pointerX: 0,
  pointerY: 0,
  visible: false,
  pressed: false,
  interactiveKind: "default",
  interactiveElement: null,
  timestamp: 0,
};

let state: RuntimeState = {
  fineHover: false,
  reducedMotion: false,
  motionAllowed: false,
};

let initialized = false;
let running = false;
let animationFrameId = 0;
let fineHoverMedia: MediaQueryList | null = null;
let reducedMotionMedia: MediaQueryList | null = null;
let pointerListenersAttached = false;

function notifyStateSubscribers() {
  stateSubscribers.forEach((subscriber) => {
    subscriber();
  });
}

function hasActiveChannel() {
  return activeChannels.cursor || activeChannels.spotlight;
}

function handlePointerMove(event: PointerEvent) {
  frame.pointerX = event.clientX;
  frame.pointerY = event.clientY;
  frame.visible = true;
  resolveInteractiveTarget(event.target);
}

function handlePointerDown(event: PointerEvent) {
  frame.pointerX = event.clientX;
  frame.pointerY = event.clientY;
  frame.pressed = true;
  frame.visible = true;
  resolveInteractiveTarget(event.target);
}

function handlePointerUpOrCancel() {
  frame.pressed = false;
}

function handleWindowMouseOut(event: MouseEvent) {
  if (event.relatedTarget === null) {
    frame.visible = false;
    frame.pressed = false;
    frame.interactiveElement = null;
    frame.interactiveKind = "default";
  }
}

function handleWindowBlur() {
  frame.visible = false;
  frame.pressed = false;
  frame.interactiveElement = null;
  frame.interactiveKind = "default";
}

function attachPointerListeners() {
  if (pointerListenersAttached || typeof window === "undefined") {
    return;
  }

  pointerListenersAttached = true;

  document.addEventListener("pointermove", handlePointerMove, {
    passive: true,
  });
  document.addEventListener("pointerdown", handlePointerDown, {
    passive: true,
  });
  document.addEventListener("pointerup", handlePointerUpOrCancel, {
    passive: true,
  });
  document.addEventListener("pointercancel", handlePointerUpOrCancel, {
    passive: true,
  });
  window.addEventListener("mouseout", handleWindowMouseOut, {
    passive: true,
  });
  window.addEventListener("blur", handleWindowBlur);
}

function detachPointerListeners() {
  if (!pointerListenersAttached || typeof window === "undefined") {
    return;
  }

  pointerListenersAttached = false;

  document.removeEventListener("pointermove", handlePointerMove);
  document.removeEventListener("pointerdown", handlePointerDown);
  document.removeEventListener("pointerup", handlePointerUpOrCancel);
  document.removeEventListener("pointercancel", handlePointerUpOrCancel);
  window.removeEventListener("mouseout", handleWindowMouseOut);
  window.removeEventListener("blur", handleWindowBlur);

  frame.visible = false;
  frame.pressed = false;
  frame.interactiveElement = null;
  frame.interactiveKind = "default";
}

function tick(timestamp: number) {
  if (!running) {
    animationFrameId = 0;
    return;
  }

  frame.timestamp = timestamp;

  frameSubscribers.forEach((subscriber) => {
    subscriber(frame);
  });

  animationFrameId = window.requestAnimationFrame(tick);
}

function updateLoopState() {
  if (typeof window === "undefined") {
    return;
  }

  const shouldRun =
    state.motionAllowed && hasActiveChannel() && frameSubscribers.size > 0;

  if (shouldRun && !running) {
    attachPointerListeners();
    running = true;
    if (!animationFrameId) {
      animationFrameId = window.requestAnimationFrame(tick);
    }
  } else if (!shouldRun && running) {
    running = false;
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
    detachPointerListeners();
  } else if (!shouldRun) {
    detachPointerListeners();
  }
}

function resolveInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    frame.interactiveElement = null;
    frame.interactiveKind = "default";
    return;
  }

  const element = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
  if (!element) {
    frame.interactiveElement = null;
    frame.interactiveKind = "default";
    return;
  }

  frame.interactiveElement = element;
  frame.interactiveKind = element.matches('[data-cursor-interactive="card"]')
    ? "card"
    : "action";
}

function updateStateFromMedia() {
  const nextState: RuntimeState = {
    fineHover: fineHoverMedia?.matches ?? false,
    reducedMotion: reducedMotionMedia?.matches ?? false,
    motionAllowed:
      (fineHoverMedia?.matches ?? false) && !(reducedMotionMedia?.matches ?? false),
  };

  const changed =
    nextState.fineHover !== state.fineHover ||
    nextState.reducedMotion !== state.reducedMotion ||
    nextState.motionAllowed !== state.motionAllowed;

  state = nextState;

  if (changed) {
    if (!state.motionAllowed) {
      frame.visible = false;
      frame.pressed = false;
      frame.interactiveElement = null;
      frame.interactiveKind = "default";
    }

    notifyStateSubscribers();
  }

  updateLoopState();
}

function initialize() {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;

  frame.pointerX = window.innerWidth / 2;
  frame.pointerY = window.innerHeight / 2;

  fineHoverMedia = window.matchMedia("(pointer: fine) and (hover: hover)");
  reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

  fineHoverMedia.addEventListener("change", updateStateFromMedia);
  reducedMotionMedia.addEventListener("change", updateStateFromMedia);

  updateStateFromMedia();
}

export function setPointerChannelActive(
  feature: PointerChannel,
  isActive: boolean,
) {
  initialize();

  if (activeChannels[feature] === isActive) {
    return;
  }

  activeChannels[feature] = isActive;
  updateLoopState();
}

export function subscribePointerFrames(subscriber: FrameSubscriber) {
  initialize();
  frameSubscribers.add(subscriber);
  updateLoopState();
  return () => {
    frameSubscribers.delete(subscriber);
    updateLoopState();
  };
}

export function subscribePointerRuntimeState(subscriber: StateSubscriber) {
  initialize();
  stateSubscribers.add(subscriber);
  return () => {
    stateSubscribers.delete(subscriber);
  };
}

export function getPointerRuntimeState(): RuntimeState {
  if (typeof window !== "undefined") {
    initialize();
  }

  return state;
}
