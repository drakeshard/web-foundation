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
- `docs/release/distribution.md`
- `docs/release/rc-validation.md`
- `docs/release/first-game-integration.md`
- `docs/release/first-game-readiness.md`
- `docs/release/v0.1.md`
- `CHANGELOG.md`
- `docs/architecture/overview.md`
- `docs/policies/dependencies.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

## Current phase

Phase 4 — First Production Game is active. Web Foundation v0.1.0 is released and validated for cross-repository consumption. Planned pre-v0.1 construction is complete; future Foundation work is driven by production integration defects, compatibility gaps, or shared-infrastructure requirements that pass the project admission rule.
