# Sprint 07 v0.1 Release Blockers

## Status

S07-09 / #83 blocker-resolution review.

Sprint 07 produced two concrete findings that could not be carried unresolved into the v0.1 exit
review. Both were corrected in focused pull requests before this review. No unresolved v0.1
release blocker remains at the start of S07-09.

This issue does not absorb non-blocking enhancements. Future improvements remain subject to the
normal backlog and #119 admission rule.

## Blocker list

| ID | Origin | Finding | Why release-blocking | Resolution | Regression / completion evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S07-B01 | S07-06/S07-07 PR CI exposed a pre-existing S07-05 lifecycle test race | The cross-renderer reload test clicked asynchronous save/load controls and read the envelope/restored snapshot before the app had published persistence completion | A required Chromium browser gate could fail nondeterministically even when runtime behavior was correct, so the release quality signal was not trustworthy | PR #155 waits for the existing Phaser/PlayCanvas persistence completion states before asserting envelope/snapshot evidence; no runtime contract changed | PR #155 CI passed; the corrected test was synchronized into the #153/#154 branches and both later passed their required CI | Resolved |
| S07-B02 | S07-08 public-surface review | `FoundationVersion` was exported from the persistence contracts even though no current consumer or persistence behavior used it and controlled version ownership says Foundation package version is release metadata rather than a save-compatibility key | Leaving an unconsumed speculative type in the reviewed v0.1 public surface would violate the release admission criteria and make an unnecessary compatibility promise | PR #156 removes the alias/export and aligns storage documentation; no replacement abstraction was added | PR #156 format/architecture, typecheck, unit tests, build, Chromium browser smoke, Firefox/WebKit compatibility, and Dependency Review passed | Resolved |

## Findings deliberately not classified as blockers

The following are documented limitations or future candidates, not v0.1 blockers:

- Playwright WebKit on Linux is compatibility engine coverage, not native macOS Safari validation.
- PlayCanvas/WebGL-heavy coverage remains Chromium-only because duplicating the complete renderer
  suite across hosted Firefox/WebKit would add cost/flakiness without proving a new Foundation
  contract.
- Hosted-CI renderer frame timing remains descriptive rather than a production frame-rate target.
  Production frame/memory budgets require representative game scenarios and target devices.
- No generic renderer adapter/package is justified. Phaser and PlayCanvas share authority
  boundaries but differ materially in frame ownership, scene/entity lifecycle, coordinate
  conversion, and presentation recreation.
- Shared decoder/errors, generic diagnostics, persistence cancellation, and additional testing
  helpers remain conditional future candidates requiring concrete consumer evidence.
- Probe-only Phaser, PlayCanvas, Preact, and signals dependencies do not ship through the shared
  Foundation/testing package manifests.

None of these prevents the documented v0.1 Foundation contract from being built, tested, or used by
the current probes.

## Mandatory gate state

The latest full release-surface PR (#156) passed the required repository checks over the accepted
v0.1 surface:

- formatting, lint, and architecture enforcement;
- TypeScript project-reference typecheck;
- unit/deterministic tests;
- package/probe build;
- full Chromium Playwright browser suite;
- focused Firefox/WebKit compatibility suite;
- dependency review.

S07-09 adds no new runtime code, dependency, package, public export, or renderer abstraction.

## Policy integrity

The blocker fixes preserve the controlled boundaries:

- authoritative game/domain state remains plain renderer-neutral TypeScript;
- renderer and UI dependencies remain application-local;
- Foundation remains caller-driven for simulation timing and does not own a render loop;
- browser input remains normalized before deterministic/domain interpretation;
- persistence remains renderer-neutral and does not serialize renderer objects;
- application-local payload validation remains outside Foundation unless separately admitted;
- only `@drakeshard/foundation` and `@drakeshard/testing` are approved shared packages;
- `idb` remains Foundation's only external runtime dependency.

## Non-blocking follow-up rule

A new finding discovered after this review is release-blocking only if it prevents a documented
Phase 3/v0.1 exit criterion, makes a required quality gate unreliable, violates an approved public
boundary, or creates an unreviewed shipped dependency/API.

Feature requests, broader device coverage, production-game systems, performance tuning without a
failing accepted budget, and speculative shared abstractions must not be pulled into S07-09.

## Conclusion

All concrete Sprint 07 release blockers identified through S07-08 are resolved.

S07-09 therefore requires no additional runtime defect fix. Its completion evidence is this explicit
blocker ledger plus green mandatory CI over the unchanged accepted v0.1 surface.

The next dependency-safe task after S07-09 is S07-10 / #84, the Phase 3 exit review.
