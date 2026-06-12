import * as THREE from "three";
import type { QualitySettings } from "../config/QualitySettings";

export type RendererInfo = {
  renderer: THREE.WebGLRenderer;
  backend: "webgpu" | "webgl";
  gpuDebug: WebGpuDebugInfo;
  note?: string;
};

export type WebGpuDebugInfo = {
  supported: boolean;
  secureContext: boolean;
  adapterAvailable: boolean;
  preferredCanvasFormat?: string;
  featureCount?: number;
  isCore?: boolean;
  vendor?: string;
  architecture?: string;
  device?: string;
  description?: string;
  limits?: {
    maxTextureDimension2D?: number;
    maxBindGroups?: number;
    maxColorAttachments?: number;
    maxSampledTexturesPerShaderStage?: number;
    maxBufferSize?: number;
    maxStorageBufferBindingSize?: number;
    maxVertexAttributes?: number;
  };
  error?: string;
};

export async function createRenderer(
  canvas: HTMLCanvasElement,
  settings: QualitySettings
): Promise<RendererInfo> {
  const pixelRatio = Math.min(window.devicePixelRatio, 2) * settings.resolutionScale;
  const gpuDebug = await collectWebGpuDebugInfo();
  const rendererOverride = new URLSearchParams(window.location.search).get("renderer");

  if (rendererOverride !== "webgl" && "gpu" in navigator) {
    try {
      const module = await import("three/webgpu");
      const WebGPURenderer = module.WebGPURenderer as unknown as typeof THREE.WebGLRenderer;
      const renderer = new WebGPURenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: "high-performance"
      } as THREE.WebGLRendererParameters);
      const maybeInit = (renderer as unknown as { init?: () => Promise<void> }).init;
      if (maybeInit) {
        await maybeInit.call(renderer);
      }
      configureRenderer(renderer, pixelRatio);
      return { renderer, backend: "webgpu", gpuDebug };
    } catch (error) {
      console.warn("WebGPU renderer failed, falling back to WebGL.", error);
      gpuDebug.error = error instanceof Error ? error.message : String(error);
    }
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance"
  });
  configureRenderer(renderer, pixelRatio);
  return {
    renderer,
    backend: "webgl",
    gpuDebug,
    note: "WebGPU unavailable in this browser; using WebGL fallback."
  };
}

export function configureRenderer(renderer: THREE.WebGLRenderer, pixelRatio: number): void {
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

async function collectWebGpuDebugInfo(): Promise<WebGpuDebugInfo> {
  const info: WebGpuDebugInfo = {
    supported: "gpu" in navigator,
    secureContext: window.isSecureContext,
    adapterAvailable: false
  };

  if (!info.supported) {
    return info;
  }

  const gpu = (navigator as Navigator & {
    gpu?: {
      getPreferredCanvasFormat?: () => string;
      requestAdapter?: (options?: { powerPreference?: "high-performance" | "low-power" }) => Promise<unknown>;
    };
  }).gpu;

  if (!gpu) {
    return info;
  }

  try {
    info.preferredCanvasFormat = gpu.getPreferredCanvasFormat?.();
    const adapter = await gpu.requestAdapter?.({ powerPreference: "high-performance" });
    if (!adapter) {
      return info;
    }

    info.adapterAvailable = true;
    const typedAdapter = adapter as unknown as {
      features?: ReadonlySet<string>;
      limits?: Record<string, number>;
      info?: {
        vendor?: string;
        architecture?: string;
        device?: string;
        description?: string;
      };
    };

    info.featureCount = typedAdapter.features?.size ?? 0;
    info.isCore = typedAdapter.features?.has("core-features-and-limits") ?? undefined;
    info.vendor = typedAdapter.info?.vendor;
    info.architecture = typedAdapter.info?.architecture;
    info.device = typedAdapter.info?.device;
    info.description = typedAdapter.info?.description;
    info.limits = {
      maxTextureDimension2D: typedAdapter.limits?.maxTextureDimension2D,
      maxBindGroups: typedAdapter.limits?.maxBindGroups,
      maxColorAttachments: typedAdapter.limits?.maxColorAttachments,
      maxSampledTexturesPerShaderStage: typedAdapter.limits?.maxSampledTexturesPerShaderStage,
      maxBufferSize: typedAdapter.limits?.maxBufferSize,
      maxStorageBufferBindingSize: typedAdapter.limits?.maxStorageBufferBindingSize,
      maxVertexAttributes: typedAdapter.limits?.maxVertexAttributes
    };
  } catch (error) {
    info.error = error instanceof Error ? error.message : String(error);
  }

  return info;
}
