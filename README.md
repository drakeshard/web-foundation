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

Sprint 09 — npm Publication and Release Automation is active as the owner-defined final distribution/completion gate. The original `v0.1.0` GitHub Release remains valid release history; the current `0.1.1` publication candidate adds Apache-2.0 licensing and npm package metadata without changing the reviewed runtime API. After npm publication is complete, Foundation returns to production-evidence-driven evolution.


## License

Apache License 2.0. See `LICENSE`.
