# Dependency Policy

## Scope

This policy applies to all runtime and development dependencies committed to the Web Foundation workspace.

## Approval criteria

A dependency addition must document:

1. the problem it solves;
2. why the platform or local implementation is insufficient;
3. whether it is a runtime or development dependency;
4. relevant transitive dependencies;
5. license;
6. maintenance status;
7. bundle or runtime impact where applicable;
8. replacement cost;
9. known security considerations.

## Repository requirements

- Package manifests use exact versions.
- `pnpm-lock.yaml` is committed.
- CI installs with `--frozen-lockfile`.
- Runtime dependencies are kept to the minimum required set.
- Dependencies with install scripts, binary downloads, or unusual lifecycle behavior require additional review.
- A dependency must not be added solely to replace a trivial local utility.

## Review

Dependency changes are reviewed as part of the pull request that introduces them. The dependency ledger must be updated when the repository establishes or changes the accepted dependency set.

## Exceptions

An exception requires an explicit rationale in the pull request and a tracked follow-up if the exception is temporary.
