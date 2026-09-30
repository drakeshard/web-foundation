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

## Renderer integration

Phaser and PlayCanvas integrations remain application-local in v0.1. Shared renderer adapters are considered only after repeated integration code demonstrates stable common semantics.

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
