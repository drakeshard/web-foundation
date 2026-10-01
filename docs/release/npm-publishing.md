# npm Publication

## Current registry state

The normal external consumer path is the public npm registry.

Released packages:

- `@drakeshard/foundation@0.1.1`;
- `@drakeshard/testing@0.1.1`.

The original `v0.1.0` GitHub Release tarballs remain immutable release history and fallback evidence. The first npm publication is intentionally `0.1.1`: Sprint 09 added npm/publication metadata and Apache-2.0 licensing after the immutable `v0.1.0` release, so those changed package contents were not republished under `0.1.0`. This historical bootstrap mismatch is intentional and is not a precedent for future release/tag drift.

## Consumer installation

```sh
pnpm add @drakeshard/foundation@0.1.1
pnpm add -D @drakeshard/testing@0.1.1
```

Consumers should commit their own lockfiles. Production applications may use an exact version or an explicitly reviewed semver range according to their dependency policy.

## Future publication workflow

Future npm publication is driven by `.github/workflows/npm-publish.yml`.

The workflow runs only when a GitHub Release is published and:

1. checks out that release tag;
2. runs the reusable release-version validator before dependency installation or any publish command;
3. requires a strict `vX.Y.Z` semver release tag to match the root workspace, Foundation, and Testing versions exactly;
4. verifies the checked-out `HEAD`, release tag commit, and GitHub release-event `GITHUB_SHA` identify the same commit;
5. installs from the committed lockfile;
6. runs the non-browser publication-quality gates;
7. packs the reviewed package directories;
8. publishes the exact packed tarballs to npm;
9. skips a package/version that already exists rather than attempting to overwrite an immutable npm version.

There is no branch-triggered or generic manual publish path in the workflow. Normal CI also runs the same validator without a release tag so package-version drift is rejected before release creation.

## npm trusted-publisher configuration

Each npm package must configure the same GitHub Actions trusted publisher:

- provider: GitHub Actions;
- GitHub organization/user: `drakeshard`;
- repository: `web-foundation`;
- workflow filename: `npm-publish.yml`;
- allowed action: `npm publish`;
- environment: none, unless a protected release environment is added later.

The workflow grants `id-token: write` only to the publication workflow and otherwise uses read-only repository contents access.

npm trusted publishing requires a supported npm CLI/Node runtime and exchanges the GitHub Actions OIDC identity for short-lived publication credentials. No long-lived npm publish token is stored in the repository.

## Provenance

Trusted publishing automatically supplies npm provenance for future publications from this public GitHub repository. The initial manually published `0.1.1` packages remain valid registry releases but are the bootstrap publication before trusted-publisher automation was configured.

## Versioning

npm package versions remain lockstep for the current Foundation/testing release process unless a later release decision changes that policy.

The package version is independent of RNG algorithm identity, save-format compatibility, game/content versions, and any future network protocol version.
