# PlayCanvas Probe Performance Observation

## Status

Sprint 06 baseline observation only. This document does not define a production performance budget,
SLO, device support floor, or release gate beyond successful real-browser execution.

## Scenario

The S06-08 Chromium observation uses the existing PlayCanvas renderer probe without introducing a
new benchmark-only scene:

- PlayCanvas 2.22.6;
- fixed 640 x 480 canvas;
- 8 x 8 toy domain and 64 presentation-owned terrain cells;
- one tactical orthographic camera;
- one directional key light;
- one terrain container;
- one presentation container;
- two dynamic presentation entities: probe and marker;
- 70 application-created PlayCanvas entities total, excluding the engine-owned root;
- 32 elevation-demo button interactions that synchronously execute the existing
  input -> toy-domain update -> PlayCanvas presentation synchronization path;
- 120 consecutive browser `requestAnimationFrame` samples after those interactions.

The interaction sequence repeatedly traverses the existing low / transition / high elevation
profile. It therefore exercises elevation mapping while keeping gameplay authority in the toy
domain.

## Measurement method

The Playwright Chromium test records two descriptive sample groups:

1. browser frame deltas from 120 consecutive `requestAnimationFrame` callbacks;
2. synchronous duration of 32 existing elevation input/domain/presentation interactions measured
   with `performance.now()` in the page.

The test also records browser user agent, viewport, device-pixel ratio, canvas dimensions, and the
active WebGL2 version/vendor/renderer/shading-language strings. The test fails if WebGL2 is not
available, but it deliberately has no frame-time or interaction-duration threshold. These numbers
are evidence about this tiny CI scenario, not production budgets.

## Environment

The canonical observation is produced by the repository's Playwright Chromium CI job on the current
GitHub-hosted Ubuntu runner image. Runtime-specific browser and WebGL strings are emitted in CI as
`PLAYCANVAS_PERF_OBSERVATION {...}`.

## Initial observation

PR CI run 36807437534 produced the first S06-08 observation on 2026-10-01:

- 120 frame samples: mean 61.267 ms, p95 100 ms, max 100.1 ms;
- 32 synchronous elevation interactions: mean 0.041 ms, p95 0.2 ms, max 0.3 ms;
- viewport 1280 x 720, device-pixel ratio 1, canvas 640 x 480;
- Playwright Chromium user agent reported Chrome 153.0.8010.12 using the Desktop Chrome device
  profile;
- WebGL version `WebGL 2.0 (OpenGL ES 3.0 Chromium)`;
- WebGL vendor `WebKit`, renderer `WebKit WebGL`, shading language
  `WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)`.

The GitHub Actions host is Ubuntu, while the Playwright Desktop Chrome device profile exposes a
Windows-style browser user agent. The generic WebGL renderer string and relatively large frame
deltas reflect this headless CI environment and are not evidence of production GPU performance.

## Interpretation boundary

The observation may reveal gross regressions or environment failures in the toy probe. It must not
be generalized to production maps, unit counts, effects, animation systems, mobile GPUs, networking,
or application-level frame budgets. Any future budget requires representative consumer evidence and
separate admission.
