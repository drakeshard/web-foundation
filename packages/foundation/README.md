# @drakeshard/foundation

Renderer-neutral browser-game infrastructure for Drakeshard projects.

## Install

```sh
pnpm add @drakeshard/foundation
```

## Public entry points

- `@drakeshard/foundation/time` — caller-driven fixed-step timing.
- `@drakeshard/foundation/random` — deterministic seeded RNG.
- `@drakeshard/foundation/input` — renderer-neutral input/action/tick contracts.
- `@drakeshard/foundation/input/browser` — browser keyboard/pointer/lifecycle adapters.
- `@drakeshard/foundation/storage` — save/settings contracts, envelopes, and migrations.
- `@drakeshard/foundation/storage/browser` — localStorage/IndexedDB implementations.

There is intentionally no root export.

## Design boundary

Foundation is infrastructure, not a game engine. Renderer objects, game-specific commands, RPG/Tactical semantics, combat, content, AI, UI, and renderer/world-coordinate conversion stay outside this package.

See the repository usage guide for integration examples and compatibility rules.

## License

Apache-2.0.
