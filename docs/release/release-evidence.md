# Release hardening and provenance evidence

## Status

Sprint 10 release hardening is complete when the repository automation and controlled project records are reconciled. No dummy package version is published solely to manufacture provenance evidence.

The initial npm packages, `@drakeshard/foundation@0.1.1` and `@drakeshard/testing@0.1.1`, were published before the trusted-publisher workflow was configured. They remain immutable bootstrap history, but Foundation 0.1.1 is not a usable consumer artifact because the registry package is missing its `dist/` tree.

Phase 4 consumer evidence opened corrective Issue #186. The genuine lockstep 0.1.2 repair release is the first release that must exercise the complete automated provenance checks below. Successful evidence is attached to that GitHub Release by the publication workflow.

## Durable release evidence

Every applicable future release produces three release assets:

- `release-evidence.json` — machine-readable source/tag/workflow/package/integrity/provenance record;
- `release-evidence.md` — human-readable summary of the same release evidence;
- `npm-audit-signatures.json` — raw npm registry signature and attestation verification output, including verified attestation bundles.

The evidence generator fails rather than creating a success record when the release tag/commit/version relationship is inconsistent, a Drakeshard package registry signature is missing, npm provenance is absent or invalid, the registry artifact differs from the reviewed packed tarball, a long-lived npm token environment is detected, or GitHub Actions OIDC is unavailable.

## Pre-publish guarantees

Before either package is published, the release workflow requires:

1. a strict `vX.Y.Z` GitHub Release tag;
2. lockstep root/Foundation/Testing package versions matching the tag;
3. checked-out `HEAD`, the tag commit, and the GitHub release-event commit to identify the same source commit;
4. frozen-lockfile dependency installation;
5. formatting/lint/architecture checks, typecheck, and unit tests;
6. the installed-package-shape regression covering the missing-`dist/` failure mode;
7. the public API/export-surface baseline;
8. clean package-consumer validation;
9. exact packed release-candidate consumer validation.

These are source and reviewed-artifact guarantees. They do not prove that npm accepted or served the publication.

## Publish-time guarantees

The publication job:

- runs only from the GitHub Release `published` event;
- has `id-token: write` for npm trusted publishing;
- does not supply a long-lived npm publish token;
- publishes the exact tarballs produced by the reviewed pack step;
- records, per package, whether this run published the version or found the immutable version already present.

The evidence generator additionally requires the GitHub Actions OIDC request environment to be available and records the workflow/run identity.

## Post-publish guarantees

After npm publication or immutable-version reuse:

1. the registry propagation/clean-consumer smoke installs the exact release version by package name, requires the installed `dist/` tree and every approved concrete export target, and imports every approved public runtime subpath;
2. registry `dist.integrity` (SHA-512) and `dist.shasum` (SHA-1) must match the exact reviewed tarball bytes produced earlier in the job;
3. the report records a SHA-256 digest of each reviewed tarball for repository/release review;
4. npm registry signature verification is run against the installed release packages;
5. verified npm provenance attestations are required for both `@drakeshard/foundation` and `@drakeshard/testing`;
6. any invalid signature or attestation in the audited dependency tree fails evidence creation;
7. the resulting JSON, Markdown summary, and raw npm verification output are attached to the GitHub Release.

A missing signature on an unrelated transitive package is recorded by npm but does not by itself invalidate the Drakeshard package provenance record. A missing signature on either released Drakeshard package does.

## Evidence interpretation

A successful `release-evidence.json` establishes that:

- the release tag and package version identify the same reviewed source commit;
- the registry package bytes match the reviewed tarballs produced by that release job;
- the job had the GitHub OIDC path available and no long-lived npm publish token environment;
- npm verified provenance attestations for both released packages;
- post-publish registry consumption succeeded.

This evidence does not replace semantic-versioning review, the public API baseline, save/RNG compatibility rules, or production-consumer validation.

## Sprint 10 exit

Sprint 10 adds process controls only. It introduces no runtime API, renderer adapter, game-domain system, or speculative subsystem.

After S10-01 through S10-04 are merged and controlled documentation is reconciled, Web Foundation returns to production-consumer-driven evolution. Future implementation work requires real production evidence and the shared-code admission rule.

The 0.1.2 packaging repair is the first subsequent real release and must retain its generated release-evidence assets as the concrete proof that the automated trusted-publishing/provenance path and corrected registry package shape succeeded. If that release fails package-shape, integrity, registry consumption, or provenance verification, Issue #186 remains open and the release process must be repaired before the control is considered operational.
