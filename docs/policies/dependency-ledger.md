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

## Runtime dependencies

`idb` 8.0.3 is approved for the browser IndexedDB save implementation. The dependency has zero runtime dependencies, built-in TypeScript declarations, and a narrow IndexedDB-focused API. It replaces non-trivial request/transaction lifecycle plumbing rather than a trivial utility.

Maintenance/replacement review: upstream remains widely used and the package surface closely mirrors native IndexedDB, so replacement with direct IndexedDB remains feasible if maintenance or compatibility changes. The wrapper is confined behind `SaveStorage`, limiting migration cost.

Security review: the package performs local browser IndexedDB wrapping and does not add network, install-script, native-binary, or transitive runtime dependency behavior. Normal repository Dependency Review remains required for updates.

## Phaser renderer-probe dependency

`phaser` 4.2.1 is approved only for `apps/renderer-probe`. Phaser is an intentionally substantial runtime dependency because Sprint 05 exists to pressure-test Foundation through a real renderer rather than reproduce renderer behavior locally. It is not a Foundation dependency, export, type boundary, or candidate shared adapter by default.

Maintenance/replacement review: Phaser 4.2.1 is the current stable release at admission time and is actively maintained by Phaser Studio. The probe integration is isolated behind app-local presentation code, so replacing or comparing the renderer does not require changing authoritative toy-domain state.

Transitive dependency review: Phaser 4.2.1 declares one runtime dependency, `eventemitter3` ^5.0.4, resolved here as 5.0.4 (MIT). Neither package requires an install script or native binary for this probe.

Security/runtime review: Phaser executes entirely in the browser presentation layer for this fixture. It does not add network access, persistence authority, or gameplay-state ownership. Normal Dependency Review remains required for additions and upgrades.

## Review requirements

A dependency change must satisfy `docs/policies/dependencies.md` and update this ledger in the same pull request when the approved dependency set changes.
