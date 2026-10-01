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


## First-production-game integration feedback

Production-game integration feedback must follow `docs/release/first-game-integration.md`.

Before requesting Foundation implementation:

- classify whether the behavior is a Foundation contract defect, consumer-integration problem, game/domain feature, compatibility gap, or shared-code admission candidate;
- reduce Foundation defects to a sanitized reproduction through the public package API where practical;
- keep proprietary game content, secrets, and private-access-only evidence out of this public repository;
- keep renderer-specific integration and game-domain semantics local by default;
- route RPG/Tactical candidates through game-local incubation or the relevant library track rather than Foundation;
- treat compatibility-sensitive changes as explicit architecture/version transitions, not ordinary bug fixes.

Use the **Foundation integration feedback** issue form for first-game intake.

“Generic” or “reusable” is not sufficient justification for Foundation ownership.
