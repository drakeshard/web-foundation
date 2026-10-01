# Browser Compatibility Coverage

## Scope

S07-06 expands Web Foundation browser coverage without turning the full Chromium suite into a
three-engine matrix.

Chromium remains the primary fast browser suite. Firefox and WebKit run one focused compatibility
fixture that exercises the browser-facing risks most likely to differ by engine:

- keyboard input through the browser adapter, action mapping, and deterministic tick handoff;
- IndexedDB-backed save/load across a page reload;
- lightweight Phaser Canvas startup from renderer-neutral ToyDomain state.

The compatibility fixture is intentionally isolated from the Chromium suite because Chromium
already exercises the deeper source tests for those flows.

## CI matrix

The required `Quality` job remains Chromium-focused so the established fast signal is unchanged.
A separate `Browser Compatibility` job installs Playwright Firefox and WebKit and runs only
`tests/e2e/browser-compatibility.spec.ts` in those two projects.

This intentionally avoids multiplying the full renderer/persistence/lifecycle/performance matrix
across every browser engine. Cross-renderer semantics remain proven by the primary Chromium suite;
Firefox/WebKit are compatibility pressure tests for browser boundaries and lightweight renderer
startup.

## Known limitations

- PlayCanvas is not part of the Firefox/WebKit compatibility project. Its current probe requires
  WebGL2 and is already exercised in Chromium; duplicating the full 3D/WebGL-heavy suite on hosted
  Linux CI would add substantial runtime and flakiness without proving a new Foundation contract.
- Safari support is represented by Playwright WebKit on Linux, not by a native macOS Safari process.
  This is useful engine coverage but not a substitute for production-device validation.
- Pointer cancellation is not used as the Firefox/WebKit compatibility gate because synthetic
  pointer-capture/cancel behavior differs between Playwright engines. The complete pointer contract,
  including pointercancel, remains covered by the primary Chromium suite.
- Performance observations remain Chromium-only. Hosted-runner timing is descriptive evidence and is
  not portable enough to use as a cross-browser regression threshold.
- If a Firefox/WebKit-specific failure or quirk is found, record it as a targeted issue with browser
  engine/version context rather than silently excluding the test.

## Local commands

- `pnpm test:e2e` — full Chromium suite.
- `pnpm test:e2e:compat` — focused Firefox + WebKit compatibility suite.
