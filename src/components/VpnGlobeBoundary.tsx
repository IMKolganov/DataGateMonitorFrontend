import React from "react";

type VpnGlobeBoundaryProps = {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  fallback: React.ReactNode;
};

type VpnGlobeBoundaryState = {
  error: Error | null;
};

/**
 * Catches THREE/react-globe.gl failures (e.g. WebGL context creation)
 * so the rest of the page stays usable.
 */
export class VpnGlobeBoundary extends React.Component<
  VpnGlobeBoundaryProps,
  VpnGlobeBoundaryState
> {
  state: VpnGlobeBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): VpnGlobeBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/** Cheap probe — avoids mounting three.js when WebGL is unavailable. */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: false });
    if (!gl || typeof (gl as WebGLRenderingContext).getParameter !== "function") {
      return false;
    }
    const lose = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}
