# Drakeshard Web Foundation

Shared web-game infrastructure for Drakeshard Studios.

## Repository scope

This repository contains renderer-neutral infrastructure and test support used by Drakeshard browser games. It does not provide a general-purpose game engine.

Shared packages:

- `@drakeshard/foundation`
- `@drakeshard/testing`

Renderer-specific integration remains application-local until repeated use justifies extraction.

## v0.1 public surface

Foundation entry points:

- `@drakeshard/foundation/time`
- `@drakeshard/foundation/random`
- `@drakeshard/foundation/input`
- `@drakeshard/foundation/input/browser`
- `@drakeshard/foundation/storage`
- `@drakeshard/foundation/storage/browser`

Testing entry point:

- `@drakeshard/testing/clock`

There are intentionally no package-root, renderer, UI, RPG, Tactical, data-framework, or debug-framework exports.

See `docs/usage/v0.1-integration.md` for current integration guidance and examples.

## Consumption during release preparation

The shared packages remain private while Sprint 08 decides the initial distribution mechanism.
Inside this repository they resolve through the pnpm workspace and are validated through package-name
imports from a clean temporary consumer fixture.

Do not assume public npm publication. S08-05 owns the explicit workspace/GitHub/tag/private-or-public
registry decision.

## Technology baseline

- TypeScript
- pnpm workspace
- Vite
- Vitest
- Playwright
- Biome
- Preact for application UI evidence only
- Phaser for 2D renderer-probe evidence only
- PlayCanvas for 2.5D renderer-probe evidence only

Preact, Phaser, and PlayCanvas are not dependencies or public types of the shared packages.

## Architecture boundary

`@drakeshard/foundation` and game-domain code must not depend on Phaser, PlayCanvas, Preact, or renderer-specific objects.

The application owns renderer loops, presentation objects, game/domain state, UI orchestration,
screen/world conversion, and game-specific save-payload validation.

See:

- `docs/usage/v0.1-integration.md`
- `docs/architecture/overview.md`
- `docs/architecture/s08-package-surface.md`
- `docs/policies/dependencies.md`
- `CONTRIBUTING.md`
- `SECURITY.md`

## Current phase

Phase 4 — v0.1 Release and First-Game Handoff.

Phase 3 renderer-probe pressure testing is complete. Sprint 08 is finalizing documentation,
compatibility records, distribution, release-candidate validation, and first-game handoff without
expanding the reviewed v0.1 surface.
