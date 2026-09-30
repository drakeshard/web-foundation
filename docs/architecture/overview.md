# Architecture Overview

Drakeshard Web Foundation is shared browser-game infrastructure, not a custom game engine.

## Dependency direction

```text
Application UI (Preact)
        |
Presentation (Phaser or PlayCanvas)
        |
Game Domain (plain TypeScript)
        |
@drakeshard/foundation
```

The lower layers must not import renderer or UI technology.

## Initial shared packages

- `@drakeshard/foundation`
- `@drakeshard/testing`

No renderer adapter packages exist in v0.1.

## Rules

- Domain state is authoritative gameplay truth.
- Phaser and PlayCanvas are presentation technologies.
- Foundation must not import Phaser, PlayCanvas, Preact, or game packages.
- Domain code must not import renderer objects, scenes, entities, cameras, or UI modules.
- Shared abstractions require demonstrated reuse or risk reduction.
- No speculative ECS, physics, navigation, networking, or AI framework.

## Extraction rule

Code starts game-local unless infrastructure consistency or safety justifies earlier sharing. A shared extraction should normally have a real consumer, tests, renderer-neutral semantics, and a smaller maintenance surface than the duplicated implementations it replaces.
