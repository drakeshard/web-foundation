# Web Foundation v0.1 Distribution Decision

## Status

Sprint 09 supersedes the original S08-05 external-consumption decision for normal consumers.

The original `v0.1.0` GitHub Release tarballs remain immutable release history and fallback evidence. Public npm registry publication is now the primary external distribution mechanism. The manually bootstrapped `0.1.1` versions remain immutable registry history, but a real external consumer later proved that `@drakeshard/foundation@0.1.1` is unusable because its published artifact is missing `dist/`. Corrective Issue #186 prepares lockstep `0.1.2` as the first registry release that must pass installed-package-shape, runtime-consumer, integrity, trusted-publishing, and provenance verification.

## Decision

Web Foundation's normal external distribution channel is the **public npm registry**.

The approved packages are:

- `@drakeshard/foundation`;
- `@drakeshard/testing`.

Consumers install reviewed package versions by package name and commit their own lockfiles. GitHub Releases continue to provide repository release history, release notes, and optional packed-asset evidence; they are not the preferred package-resolution mechanism.

## Why this mechanism

The first production consumer must be able to consume Foundation independently of repository topology. Workspace-only consumption would require the game to live inside the Foundation pnpm workspace, which is not an architectural requirement.

A direct Git dependency on the repository tag is also a poor fit for the current monorepo shape:

- the Git repository root is not either shared package;
- the built package artifacts are produced inside package subdirectories;
- consumers should receive the reviewed package files/exports, not rely on source-relative imports or repository-wide prepare behavior.

Packing each approved package produces the same package-shaped artifact that consumer validation is already designed around while avoiding registry infrastructure for the first release.

GitHub Releases provide a tagged release record plus downloadable release assets. Because the Foundation repository is intentionally public, a normal consumer does not need package-registry credentials merely to download the v0.1 assets.

## Options considered

### Workspace-only

**Advantages**

- already used by the renderer-probe workspace;
- no release upload or external package resolution;
- fastest local-development feedback.

**Limitations**

- requires the consumer to share the same workspace/repository topology;
- does not provide a standalone cross-repository release artifact;
- couples production consumption to source checkout layout.

**Decision**

Retain workspace links for development inside this repository, but do not use workspace-only as the external v0.1 distribution mechanism.

### Git repository/tag dependency

**Advantages**

- tag provides an immutable-looking source reference and clear compatibility point;
- no package registry is required.

**Limitations**

- the repository is a monorepo whose root is not `@drakeshard/foundation` or `@drakeshard/testing`;
- package consumers would otherwise depend on repository scripts/layout/build behavior rather than the reviewed package artifact;
- direct source consumption weakens the release-package boundary established by S08-01.

**Decision**

Use the tag as the release source-of-truth, but distribute packed package artifacts attached to that release instead of using the repository itself as the dependency package.

### Private package registry / GitHub Packages

**Advantages**

- conventional package-name/version resolution;
- access controls are available for private distribution;
- registry metadata can simplify dependency-management workflows.

**Limitations**

- requires registry configuration and authentication for private consumers;
- introduces token/permission/CI secret management before a demonstrated need exists;
- adds publishing and retention/provenance policy work beyond the first consumer's current requirement.

**Decision**

Deferred. Re-evaluate when private package distribution, multiple independent consumers, automated update tooling, or registry policy provides a concrete benefit.

### Public package registry

**Advantages**

- simplest conventional installation for arbitrary public consumers;
- mature registry tooling and version resolution.

**Limitations**

- publishes the package globally rather than only exposing the already-public source/release;
- creates package-name ownership and registry-release obligations that are unnecessary for the current internal consumer;
- would require changing the current `private: true` package policy.

**Decision**

Not approved for v0.1.

## Release artifact contract

S08-08 / #92 will create the formal tag/release only after release-candidate validation passes.

The release process will:

1. check out the exact release candidate commit;
2. install from the committed lockfile with frozen resolution;
3. run the required repository quality gates;
4. build the workspace;
5. pack `packages/foundation` and `packages/testing` as package tarballs;
6. attach both tarballs to the GitHub Release for the approved v0.1 tag;
7. attach or record SHA-256 digests for the uploaded package artifacts;
8. verify the released assets can be consumed through the documented URLs.

Expected artifact naming should be stable and package-specific, for example:

- `drakeshard-foundation-0.1.0.tgz`;
- `drakeshard-testing-0.1.0.tgz`;
- `SHA256SUMS`.

S08-07 / #91 must validate the exact packed artifacts or the closest pre-release equivalent before S08-08 publishes the release.

## Consumer dependency shape

A cross-repository consumer pins an exact release-asset URL, for example:

```json
{
  "dependencies": {
    "@drakeshard/foundation": "https://github.com/drakeshard/web-foundation/releases/download/v0.1.0/drakeshard-foundation-0.1.0.tgz"
  }
}
```

A consumer that needs `@drakeshard/testing` may pin the corresponding testing tarball as a development dependency.

The consumer commits its own lockfile. The lockfile and release checksum/digest provide artifact-resolution evidence in addition to the release tag.

Do not depend on `releases/latest`; consumers must pin the explicit v0.1 release URL.

## Authentication and access implications

### Current public Foundation repository

The v0.1 release assets are publicly readable with the repository. No package-registry token is required by the normal consumer path.

A private production-game repository may still depend on the public Foundation release asset; the privacy of the game repository does not require the Foundation artifact itself to be private.

### If Foundation later becomes private

This decision does not pre-approve a private-release authentication model.

A private Foundation repository would require authenticated GitHub asset access or a registry/other distribution mechanism suitable for CI and developer machines. That change is a release-policy decision and must be revisited before changing repository visibility or artifact access.

## Provenance, signing, and integrity

The v0.1 provenance chain is:

- protected `main`;
- required CI/review gates;
- a release tag pointing at the reviewed commit;
- GitHub Release assets created from that release candidate;
- recorded asset digests/checksums;
- consumer lockfile resolution.

No separate package-signing infrastructure is required for v0.1 because there is no registry publication or current consumer requirement for an additional signing system.

If organizational policy later requires signed/attested packages, registry provenance, Sigstore-style attestations, or immutable-release enforcement, add that control through a separate release-policy decision rather than silently changing the v0.1 contract.

## Release automation decision

For the original v0.1.0 GitHub Release, no dedicated publishing workflow was required.

Sprint 09 changes the forward release policy: after the initial npm package creation, future npm releases must use a controlled GitHub Actions trusted-publishing/OIDC path with provenance. Sprint 10 adds durable release evidence: the workflow needs `contents: write` only to attach provenance/integrity reports to the already-published GitHub Release, while npm authentication remains OIDC-based with no long-lived npm token.

S08-07 will validate repeatable pack/consumer commands. S08-08 may execute the small number of release packing/upload steps manually or through existing GitHub release tooling. A dedicated automated publication pipeline should be introduced only if repeated releases or additional consumers make the operational benefit concrete.

The earlier S08-05 no-follow-up conclusion is superseded by Sprint 09 issues #169–#175 and the Sprint 10 hardening record in `docs/release/release-evidence.md`.

## Dependency-policy impact

This distribution decision adds no runtime dependency and does not change the approved dependency ledger.

External package consumption must still use exact release artifacts and committed lockfiles. No renderer, UI, RPG, Tactical, or game-specific dependency enters either shared package.

## Boundaries preserved

- GitHub remains authoritative for tag/release/artifact state.
- Package manifests remain the reviewed S08-01 surface.
- Distribution does not add a root export or source-relative consumption path.
- The game remains free to compose Foundation with renderer and domain libraries without sharing a monorepo.
- The decision does not publish Foundation to npm or GitHub Packages.
- The decision does not authorize a new shared package.
