# Drakeshard Web Foundation

Shared web-game infrastructure for Drakeshard Studios.

## Repository scope

This repository contains renderer-neutral infrastructure and test support used by Drakeshard browser games. It does not provide a general-purpose game engine.

Initial shared packages:

- `@drakeshard/foundation`
- `@drakeshard/testing`

Renderer-specific integration remains application-local until repeated use justifies extraction.

## Technology baseline

- TypeScript
- pnpm workspace
- Vite
- Vitest
- Playwright
- Biome
- Preact for application UI
- Phaser for 2D presentation
- PlayCanvas for 2.5D presentation

## Architecture boundary

`@drakeshard/foundation` and game-domain code must not depend on Phaser, PlayCanvas, Preact, or renderer-specific objects.

See:

- `docs/guides/v0.1-usage.md`
- `docs/release/versioning.md`
- `docs/release/v0.1.md`
- `CHANGELOG.md`
- `docs/architecture/overview.md`
- `docs/policies/dependencies.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

## Current phase

v0.1 is in Phase 4 — Release and First-Game Handoff. The approved package surface is finalized; current work is usage documentation, compatibility/version records, distribution/release preparation, and first-game handoff.
