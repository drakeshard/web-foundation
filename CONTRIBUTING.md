# Contributing

## Scope

These requirements apply to changes in `drakeshard/web-foundation`.

## Development workflow

1. Branch from `main`.
2. Keep the change set focused on one coherent outcome.
3. Run the repository verification commands before requesting review.
4. Open a pull request.
5. Resolve review comments and required CI failures before merge.

Direct changes to `main` are not part of the supported workflow.

## Required checks

A change is eligible for merge when all required repository checks pass, including formatting/linting, type checking, tests, and build validation applicable to the change.

## Architecture changes

A pull request that expands the shared API or package surface must document:

- the current consumer or consumers;
- the problem being solved;
- alternatives considered;
- runtime and allocation impact where relevant;
- maintenance and coupling impact;
- dependency or supply-chain impact;
- why game-local implementation is insufficient.

Renderer-specific types must not enter Foundation or game-domain contracts.

## Dependencies

New dependencies must comply with `docs/policies/dependencies.md`. Dependency additions require explicit justification and review.

## Documentation

Changes to controlled behavior must update the authoritative repository document or architecture decision record in the same pull request when practical.
