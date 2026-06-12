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

## Frame Pacing Follow-Up

A later visible Chrome audit showed `30 FPS` with `RAF 33.3 ms` while render submit and CPU work were low. A read-only subagent audit found no app-level half-rate limiter: the loop schedules one `requestAnimationFrame` per frame, and the HUD reports raw RAF interval separately from render/CPU work.

Tried and rejected:

- `renderer.setAnimationLoop(...)` was tested because Three recommends it for renderer compatibility. In the visible Chrome/WebGPU QA path it regressed to about `1 FPS` / `RAF ~1017 ms`, so the app kept the manual `requestAnimationFrame` loop.

Kept:

- WebGPU renderer options now request `powerPreference: "high-performance"`, matching the WebGL fallback.
- WebGPU debug adapter collection requests the adapter with the same high-performance preference.
- The manual `requestAnimationFrame` loop remains active because it recovered the visible Chrome path from the `setAnimationLoop` regression.

Related streaming fix:

- The world streamer no longer stops queue processing completely when frame time is high. It now builds one queued chunk per pressure frame so a temporary 30 Hz / high-frame-time session cannot permanently leave the world at low live chunk counts with queued work stuck.
