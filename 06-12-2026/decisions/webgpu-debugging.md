# Decision: WebGPU Debugging Data

## Decision

Expose useful WebGPU capability data in the debug HUD even when the renderer falls back to WebGL.

## Why

The app is WebGPU-first, but browser support and adapter access vary by machine, secure context, GPU, and driver. The debug HUD needs to explain which rendering path the user is actually on.

## Data Collected

- `navigator.gpu` support.
- Secure context.
- Adapter availability.
- Preferred canvas format.
- Feature count.
- Core WebGPU signal via `core-features-and-limits`.
- Adapter metadata when exposed by the browser.
- Limits including max texture size, bind groups, sampled textures, buffer sizes, storage buffer binding size, color attachments, and vertex attributes.
- Renderer fallback error when WebGPU initialization fails.
- WebGPU path keeps canvas MSAA disabled for now. A visible Chrome audit showed 4x MSAA was too expensive for the higher-poly pass, so the 60 FPS target takes priority.
- Visible-scene draw-call and triangle estimates when backend counters are zero or cumulative.
- `?renderer=webgl` diagnostic override while still collecting WebGPU capability data.

## Source

MDN describes WebGPU access as feature detection through `navigator.gpu`, adapter request, and device/feature/limit capabilities. The implementation follows that access model without requiring raw WebGPU device ownership from the app.

Visible Chrome testing on the third-person build reported `21-24 FPS` on both WebGPU and the WebGL diagnostic override, even after draw calls dropped near `50`. That result is recorded as a browser/session observation and not treated as a WebGPU-only failure.
