const WEBGPU_EXPERIMENT_FLAG =
  process.env.NEXT_PUBLIC_EXPERIMENTAL_WEBGPU_BACKGROUND === "1";

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

type NavigatorWithGPU = Navigator & {
  gpu?: {
    requestAdapter?: () => Promise<unknown>;
  };
};

export function getConnectionSaveData() {
  return (
    (navigator as NavigatorWithConnection).connection?.saveData === true
  );
}

export async function canUseWebGPUBackground() {
  if (!WEBGPU_EXPERIMENT_FLAG || typeof navigator === "undefined") {
    return false;
  }

  const gpu = (navigator as NavigatorWithGPU).gpu;
  if (!gpu || typeof gpu.requestAdapter !== "function") {
    return false;
  }

  try {
    const adapter = await gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}
