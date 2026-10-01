# npm Publication

## Current registry state

The normal external consumer path is the public npm registry.

Registry history:

- `@drakeshard/foundation@0.1.1` and `@drakeshard/testing@0.1.1` are immutable bootstrap publications.
- A real external consumer discovered that the installed Foundation 0.1.1 registry artifact has export metadata but no `dist/` files, so Foundation 0.1.1 must not be treated as a usable consumer release.
- `0.1.2` is the focused packaging-repair release. It preserves the approved public API while adding registry-installed artifact-shape validation.

The original `v0.1.0` GitHub Release tarballs remain immutable release history and fallback evidence. The first npm publication is intentionally `0.1.1`: Sprint 09 added npm/publication metadata and Apache-2.0 licensing after the immutable `v0.1.0` release, so those changed package contents were not republished under `0.1.0`. This historical bootstrap mismatch is intentional and is not a precedent for future release/tag drift.

## Consumer installation

```sh
pnpm add @drakeshard/foundation@0.1.2
pnpm add -D @drakeshard/testing@0.1.2
```

Use these commands after 0.1.2 is published and the release workflow verifies the installed registry shape, runtime imports, integrity, and provenance.

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
9. skips a package/version that already exists rather than attempting to overwrite an immutable npm version;
10. installs the exact registry versions into a clean external consumer and verifies version, `dist/`, package metadata, every approved export target, and runtime imports;
11. verifies registry propagation and clean external consumption;
12. verifies the exact packed tarballs against npm registry integrity metadata and requires valid npm provenance attestations for both packages;
13. attaches `release-evidence.json`, `release-evidence.md`, and raw `npm-audit-signatures.json` to the GitHub Release.

There is no branch-triggered or generic manual publish path in the workflow. Normal CI also runs the same validator without a release tag so package-version drift is rejected before release creation.

## npm trusted-publisher configuration

Each npm package must configure the same GitHub Actions trusted publisher:

- provider: GitHub Actions;
- GitHub organization/user: `drakeshard`;
- repository: `web-foundation`;
- workflow filename: `npm-publish.yml`;
- allowed action: `npm publish`;
- environment: none, unless a protected release environment is added later.

The publication workflow grants `id-token: write` for npm trusted publishing and `contents: write` only so it can attach the verified evidence files to the already-published GitHub Release. No long-lived npm publication credential is stored.

npm trusted publishing requires a supported npm CLI/Node runtime and exchanges the GitHub Actions OIDC identity for short-lived publication credentials. No long-lived npm publish token is stored in the repository.

## Provenance

Trusted publishing supplies npm provenance for future publications from this public GitHub repository. The manually published `0.1.1` versions remain immutable bootstrap history from before trusted-publisher automation was configured. Foundation 0.1.1 is not a usable consumer artifact because its published package is missing `dist/`; provenance history does not make a defective artifact valid.

Sprint 10 adds durable verification rather than relying on console output. The genuine 0.1.2 repair release is the first release that must exercise the complete automated trusted-publishing and evidence path defined in `docs/release/release-evidence.md`; no dummy release is created solely to manufacture that record.

## Versioning

npm package versions remain lockstep for the current Foundation/testing release process unless a later release decision changes that policy.

The package version is independent of RNG algorithm identity, save-format compatibility, game/content versions, and any future network protocol version.
