# Browser Compatibility Coverage

## Scope

S07-06 expands Web Foundation browser coverage without turning the full Chromium suite into a
three-engine matrix.

Chromium remains the primary fast browser suite and continues to execute every Playwright test.
Firefox and WebKit run the existing focused browser tests that exercise the compatibility risks most
likely to differ by engine:

- `input.spec.ts` for keyboard, pointer, wheel, lifecycle reset, mapping, and deterministic tick
  handoff;
- `save-service.spec.ts` for IndexedDB save/load, reload, migrations, and structured failures;
- `phaser-probe.spec.ts` for lightweight Phaser Canvas startup from renderer-neutral ToyDomain
  state.

## CI matrix

The required `Quality` job remains Chromium-focused so the established fast signal is unchanged.
A separate `Browser Compatibility` job installs Playwright Firefox and WebKit and runs only those
focused fixtures in the two compatibility projects.

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
- Performance observations remain Chromium-only. Hosted-runner timing is descriptive evidence and is
  not portable enough to use as a cross-browser regression threshold.
- If a Firefox/WebKit-specific failure or quirk is found, record it as a targeted issue with browser
  engine/version context rather than silently excluding the test.

## Local commands

- `pnpm test:e2e` — full Chromium suite.
- `pnpm test:e2e:compat` — focused Firefox + WebKit compatibility suite.
