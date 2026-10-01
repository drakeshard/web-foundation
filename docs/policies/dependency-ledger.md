# Dependency Ledger

## Scope

This ledger records the dependency set approved for the Web Foundation workspace. It is reviewed whenever a dependency is added, removed, or materially upgraded.

| Dependency | Scope | Purpose | License | Runtime impact | Replacement cost | Approval rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `typescript` 7.0.2 | Development | Type checking, project references, declaration output, and AST support for architecture checks | Apache-2.0 | None in shipped browser code | Medium | Core language/tooling dependency |
| `vite` 8.3.1 | Development | Browser smoke fixture server and future probe build tooling | MIT | None in shipped Foundation package | Low | Standard development server/build tool for web probes |
| `vitest` 5.0.2 | Development | Unit and deterministic simulation testing | MIT | None | Low | Vite-compatible test runner with suitable TypeScript support |
| `@playwright/test` 1.63.0 | Development | Real-browser smoke and browser-integration tests | Apache-2.0 | None | Medium | Required for Chromium/Firefox/WebKit automation |
| `@biomejs/biome` 2.5.14 | Development | Formatting and static lint checks | MIT / Apache-2.0 | None | Medium | Consolidates formatting and linting with a small tool surface |
| `idb` 8.0.3 | Runtime (browser storage boundary) | Promise-based IndexedDB wrapper for durable save records | ISC | ~1.19 kB brotli per upstream package documentation; zero runtime dependencies | Low-Medium | Avoids duplicating IndexedDB request/transaction/error plumbing while keeping the wrapper internal to the browser adapter |
| `phaser` 4.2.1 | Runtime (renderer-probe app only) | Concrete 2D renderer used to pressure-test Foundation boundaries through a real browser presentation stack | MIT | Large renderer/game-framework bundle in the private probe app only; not shipped by `@drakeshard/foundation` | Medium | Sprint 05 requires a real Phaser consumer; dependency remains app-local and has one runtime dependency (`eventemitter3` 5.0.4) |
| `preact` 10.29.8 | Runtime (renderer-probe app only) | Small component runtime for the Sprint 05 UI bridge pressure test | MIT | Small UI runtime isolated to the private probe app; no Foundation package impact | Low | Provides the concrete UI consumer required by S05-06 without creating a shared UI package |
| `@preact/signals` 2.11.2 | Runtime (renderer-probe app only) | UI-facing derived/transient signal state for the Preact probe UI | MIT | Small app-local state layer; one runtime dependency (`@preact/signals-core` 1.14.4) plus peer Preact | Low | Exercises the intended view-model/signal boundary while keeping simulation authority outside signals |
| `playcanvas` 2.22.6 | Runtime (renderer-probe app only) | Concrete 3D renderer used to pressure-test the same Foundation/domain boundaries through a tactical camera stack | MIT | Large 3D engine bundle isolated to the private probe app; not shipped by `@drakeshard/foundation` | Medium | Sprint 06 requires a real second renderer consumer; PlayCanvas remains app-local and its runtime dependency surface is type-only packages (`@types/webxr` 0.5.24 and `@webgpu/types` 0.1.74) |

## Runtime dependencies

`idb` 8.0.3 is approved for the browser IndexedDB save implementation. The dependency has zero runtime dependencies, built-in TypeScript declarations, and a narrow IndexedDB-focused API. It replaces non-trivial request/transaction lifecycle plumbing rather than a trivial utility.

Maintenance/replacement review: upstream remains widely used and the package surface closely mirrors native IndexedDB, so replacement with direct IndexedDB remains feasible if maintenance or compatibility changes. The wrapper is confined behind `SaveStorage`, limiting migration cost.

Security review: the package performs local browser IndexedDB wrapping and does not add network, install-script, native-binary, or transitive runtime dependency behavior. Normal repository Dependency Review remains required for updates.

## Phaser renderer-probe dependency

`phaser` 4.2.1 is approved only for `apps/renderer-probe`. Phaser is an intentionally substantial runtime dependency because Sprint 05 exists to pressure-test Foundation through a real renderer rather than reproduce renderer behavior locally. It is not a Foundation dependency, export, type boundary, or candidate shared adapter by default.

Maintenance/replacement review: Phaser 4.2.1 is the current stable release at admission time and is actively maintained by Phaser Studio. The probe integration is isolated behind app-local presentation code, so replacing or comparing the renderer does not require changing authoritative toy-domain state.

Transitive dependency review: Phaser 4.2.1 declares one runtime dependency, `eventemitter3` ^5.0.4, resolved here as 5.0.4 (MIT). Neither package requires an install script or native binary for this probe.

Security/runtime review: Phaser executes entirely in the browser presentation layer for this fixture. It does not add network access, persistence authority, or gameplay-state ownership. Normal Dependency Review remains required for additions and upgrades.

## Preact renderer-probe UI dependencies

`preact` 10.29.8 and `@preact/signals` 2.11.2 are approved only for `apps/renderer-probe`. They exist to pressure-test the explicit UI bridge required by S05-06 and are not Foundation dependencies, exports, or a shared UI framework decision.

Maintenance/replacement review: both packages are actively maintained in the Preact ecosystem. The integration is isolated behind app-local UI code, so another UI renderer or state mechanism can replace them without changing Foundation contracts or authoritative toy-domain state.

Transitive dependency review: Preact has no required runtime dependencies. `@preact/signals` depends on `@preact/signals-core` ^1.14.4, resolved here as 1.14.4 (MIT), and peers on Preact. These packages require no install scripts or native binaries.

Security/runtime review: the UI bridge renders local derived/transient state and emits app-local intentions. It receives no persistence, network, timing, RNG, or gameplay-state authority. Normal Dependency Review remains required for additions and upgrades.

## PlayCanvas renderer-probe dependency

`playcanvas` 2.22.6 is approved only for `apps/renderer-probe`. It is the concrete second renderer required by Sprint 06 and is not a Foundation dependency, export, shared renderer adapter, or package-extraction decision.

Maintenance/replacement review: PlayCanvas 2.22.6 is an actively maintained MIT-licensed engine release. The integration is isolated behind app-local presentation code and consumes the same renderer-neutral toy domain, so renderer replacement does not change authoritative gameplay state.

Transitive dependency review: PlayCanvas declares `@types/webxr` ^0.5.24 and `@webgpu/types` ^0.1.70, resolved here as 0.5.24 (MIT) and 0.1.74 (BSD-3-Clause). They provide type declarations; no install scripts or native binaries are introduced.

Security/runtime review: PlayCanvas owns only browser presentation and scene objects in this probe. It receives no persistence authority, semantic command ownership, or authoritative gameplay-state role. Normal Dependency Review remains required for additions and upgrades.

## Review requirements

A dependency change must satisfy `docs/policies/dependencies.md` and update this ledger in the same pull request when the approved dependency set changes.


## S07-08 v0.1 release review

The Sprint 07 release-surface review rechecked the lockfile/importer split and approved dependency
boundaries after both renderer probes and the cross-renderer pressure test.

- `@drakeshard/foundation` still has exactly one external runtime dependency: `idb` 8.0.3.
- `@drakeshard/testing` adds no external runtime dependency; Foundation is a workspace development
  dependency for deterministic test composition.
- Phaser, PlayCanvas, Preact, and `@preact/signals` remain dependencies of the private
  renderer-probe application only.
- Development tooling remains outside shipped Foundation runtime code.
- No new shared package or renderer adapter is admitted by S07-08.

The detailed public-surface and extraction evidence is recorded in
`docs/architecture/sprint-07-v01-surface-review.md`.
