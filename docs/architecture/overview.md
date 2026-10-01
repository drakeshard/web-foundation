# Architecture Overview

## Status

Current architecture baseline for Web Foundation v0.1.

## Layering

```text
Application UI
Preact + HTML + CSS
        |
Presentation
Phaser or PlayCanvas
        |
Game Domain
Plain TypeScript gameplay rules and state
        |
Drakeshard Foundation
Renderer-neutral infrastructure
```

Dependencies flow downward. Lower layers must not depend on higher layers.

## Package scope

v0.1 defines two shared packages:

- `@drakeshard/foundation`
- `@drakeshard/testing`

Additional packages require demonstrated cross-game need.

The accepted Sprint 07 v0.1 package/subpath surface and final extraction decisions are recorded in
[Sprint 07 v0.1 Public Surface, Dependency, and Extraction Review](./sprint-07-v01-surface-review.md).

## Required boundaries

Foundation and game-domain code must not import:

- Phaser;
- PlayCanvas;
- Preact or `@preact/signals`;
- renderer scenes, entities, cameras, materials, sprites, or UI modules;
- game-specific packages from another title.

Presentation code may depend on domain and Foundation.

## Domain ownership

The game domain owns authoritative gameplay state and rules. Renderer objects represent domain state but are not authoritative game entities.

## Time and simulation

Simulation uses caller-driven fixed steps. Foundation never owns the render loop or `requestAnimationFrame`.

The accepted v0.1 time and fixed-step contract is defined in [Time and Fixed-Step Contract](./time.md).

## Deterministic random

Deterministic gameplay randomness uses an explicit versioned algorithm and state contract. Foundation deterministic paths must not use `Math.random()`.

The accepted v0.1 RNG contract is defined in [Deterministic RNG Contract](./random.md).

## Browser input

Browser keyboard, pointer, and wheel input is normalized at a renderer-neutral boundary before logical action mapping or deterministic simulation consumption. DOM event objects and renderer coordinate types never enter deterministic contracts.

The accepted v0.1 browser input contract is defined in [Browser Input Boundary Contract](./input.md).

## Renderer integration

Phaser and PlayCanvas integrations remain application-local in v0.1. The completed two-renderer
comparison found stable authority boundaries but no narrow shared renderer lifecycle contract that
would reduce maintenance. No renderer adapter package is admitted.

The application-local renderer-probe toy domain remains outside Foundation and is documented in
[Renderer-Probe Toy Domain](./renderer-probe-domain.md). The cross-renderer evidence and extraction
decisions are recorded in
[Phaser and PlayCanvas Integration Semantics Comparison](./renderer-integration-comparison.md).

## Extraction criteria

Code may move into the shared Foundation when:

- a current consumer needs the behavior;
- the behavior is covered by tests;
- renderer-specific assumptions are absent;
- extraction reduces duplicated maintenance or operational risk;
- the shared API is narrower than the game-specific implementations it replaces.

## Deferred systems

The following are not part of the v0.1 Foundation unless later evidence justifies them:

- ECS;
- physics;
- navigation;
- networking;
- AI framework;
- universal scene graph;
- universal entity model.
