# Contributing

## Workflow

- Create a focused branch from `main`.
- Make one coherent change per pull request where practical.
- Run the local verification suite before requesting review.
- Merge only after required CI checks pass and review conversations are resolved.

## Required quality

Changes must preserve strict TypeScript, architecture boundaries, deterministic behavior where applicable, and dependency discipline.

## Architecture changes

A change that expands the shared surface area must explain:

- current consumer(s);
- alternatives considered;
- runtime cost;
- maintenance cost;
- dependency/supply-chain cost;
- why game-local code is insufficient.

## Dependencies

New dependencies must update `docs/policies/dependencies.md` or the dependency ledger process established by the repository.

## Main branch

Direct pushes should be disabled through GitHub rules. Use pull requests.
