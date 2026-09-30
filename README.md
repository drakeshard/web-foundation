# Drakeshard Web Foundation

Shared, renderer-neutral web-game infrastructure for Drakeshard Studios.

## Status

Foundation v0.1 — engineering baseline.

This repository is **not** a custom game engine. Shared functionality is added only when a real game or validated architecture probe demonstrates a reusable need.

## Architecture

- TypeScript
- pnpm workspace
- Vite
- Vitest
- Playwright
- Biome
- Preact for application UI only
- Phaser for 2D presentation
- PlayCanvas for true 2.5D presentation

The game domain and `@drakeshard/foundation` must not depend on Phaser, PlayCanvas, Preact, or renderer-specific objects.

## Initial workspace

```text
packages/
  foundation/
  testing/

apps/
  probe-phaser/      # added when renderer probing begins
  probe-playcanvas/  # added when renderer probing begins
```

## Development

Toolchain versions are pinned in the repository. A committed lockfile and green frozen-install CI are required before feature implementation begins.

See `docs/architecture/overview.md` and `CONTRIBUTING.md`.
