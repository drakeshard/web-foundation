# Sprint 08 v0.1 Package Surface Finalization

## Status

S08-01 / #85 release-candidate package-surface evidence.

The package surface is finalized against the S07-08 review. This task does not choose or execute a
distribution mechanism; S08-05 / #89 owns the workspace/GitHub/package-registry decision.

## Shared packages

The only approved shared packages remain:

- `@drakeshard/foundation`;
- `@drakeshard/testing`.

The private renderer-probe application is release validation evidence and is not a shared package.

## Foundation exports

`@drakeshard/foundation` exposes only the reviewed subpaths:

- `./input`;
- `./input/browser`;
- `./random`;
- `./time`;
- `./storage`;
- `./storage/browser`.

There is no root `.` export, no placeholder data/debug export, and no renderer/game/genre export.

The obsolete empty root `src/index.ts` and placeholder `.gitkeep` were removed so a clean build
does not emit an unused root `dist/index.js` / `dist/index.d.ts` artifact.

## Testing exports

`@drakeshard/testing` exposes only:

- `./clock`.

Its obsolete empty root source index and placeholder file were removed for the same reason.

## Manifest decisions

Both manifests remain:

- version `0.1.0`;
- ESM via `"type": "module"`;
- explicit conditional subpath exports with `types` and `import` targets;
- artifact-scoped to `dist`;
- marked `sideEffects: false`;
- `private: true`.

Keeping `private: true` is intentional. Distribution has not yet been approved, and #89 explicitly
forbids assuming public npm publication. S08-01 therefore prevents accidental publication while
finalizing the package shape. If #89 later approves a registry publication path, that task must make
the corresponding publishing/private-setting change as part of the approved mechanism.

No `publishConfig`, registry URL, access policy, or release automation is added here.

## Dependency boundary

`@drakeshard/foundation` still has exactly one external runtime dependency:

- `idb` 8.0.3.

`@drakeshard/testing` has no external runtime dependency. Its Foundation workspace relationship is
development-only.

The finalized shared manifests contain no Phaser, PlayCanvas, Preact, signals, RPG, Tactical, or
game-specific dependency.

## Consumer-style validation

`scripts/validate-package-exports.mjs` validates the release-candidate package shape after build.

It verifies:

- exact approved package names, version, private/ESM/files/side-effect metadata;
- exact approved export subpaths and absence of a root catch-all export;
- every runtime/type export target exists in `dist`;
- obsolete root artifacts are absent;
- shared-manifest dependency boundaries have not expanded;
- Foundation's runtime dependency set remains exactly `idb` 8.0.3;
- Testing remains runtime-dependency-free.

The script then creates a temporary clean consumer directory, symlinks only the two built package
roots into that consumer's `node_modules`, and validates:

1. Node ESM can import every approved runtime subpath by package name;
2. TypeScript can typecheck a consumer source that imports representative runtime values and types
   from every approved Foundation/testing entry point.

No source-relative package import is used by the generated consumer.

CI runs this validation after the package build and before Chromium browser tests.

## Release boundary

S08-01 finalizes the current package/export shape only.

It does not:

- choose workspace, GitHub/tag, private registry, or public registry distribution;
- publish packages;
- create a tag or release;
- add documentation promises beyond implemented APIs;
- reintroduce removed/speculative exports;
- add renderer or genre packages.

Those decisions remain with their later Sprint 08 issues.

## Conclusion

The v0.1 release-candidate package manifests match the public surface approved in S07-08 and now
have a clean consumer-style validation gate.

The next task is S08-02 / #86, usage documentation and integration examples for this finalized
surface.
