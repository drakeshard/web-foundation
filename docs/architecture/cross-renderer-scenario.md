# Sprint 07 Canonical Cross-Renderer Scenario

## Scope

S07-01 uses one app-local deterministic toy-domain scenario to pressure-test the Phaser and
PlayCanvas probes with identical domain inputs. The scenario is evidence for the existing boundaries;
it is not a new Foundation API, renderer adapter, replay format, or game-domain framework.

The canonical definition lives in
`apps/renderer-probe/src/scenario/cross-renderer-scenario.ts`.

## Canonical domain inputs

The scenario owns only renderer-neutral data:

- scenario id: `s07-cross-renderer-v1`;
- initial domain snapshot: tick 0, 8x8 world, probe at `{x:3,y:3}`, marker at
  `{x:1,y:1}`;
- deterministic RNG seed: `0x0701cafe`;
- tick count: 8;
- one ordered command list per tick.

Ordered commands are:

1. move probe +1 on x;
2. randomize marker;
3. move probe -1 on y, then set marker to `{x:6,y:5}`;
4. no commands;
5. move probe -1 on x;
6. randomize marker;
7. move probe +1 on y;
8. move probe +1 on x.

The runner restores a fresh state from the canonical initial snapshot before each execution, so running
the pressure test cannot mutate the scenario definition or either live probe's authoritative state.

## Locked result

With the current domain and `xoshiro128starstar-v1` contract, both runs must produce:

- final tick: 8;
- final probe position: `{x:4,y:3}`;
- final marker position: `{x:3,y:5}`;
- final RNG state: `[653116501,1255092782,2110617100,3595439280]`;
- deterministic domain/RNG checksum: `a016a4a7`.

The checksum is a fixture-local FNV-1a checksum over the JSON-serialized final domain snapshot and RNG
snapshot. It is test evidence only and is not a persistence, networking, or public compatibility
contract.

## Renderer-only setup

Renderer setup is deliberately outside the canonical scenario data.

The Phaser page boots its normal Phaser Canvas probe and, when the pressure-test control is invoked,
projects the scenario's final authoritative state through the existing 2D
`projectToyPresentation(..., 1)` path.

The PlayCanvas page boots its normal WebGL/orthographic probe and, when the same pressure test is
invoked, projects that same final authoritative state through
`projectToyStateToPlayCanvas(..., 1)`, including presentation-only elevation.

The two projections may differ in renderer-specific coordinates and object mechanics. They must not
change the scenario id, initial state, seed, ordered commands, tick count, final domain snapshot, RNG
snapshot, or checksum.

## Automated evidence

Unit coverage locks the canonical inputs/result and verifies that both projection paths consume the
same final state without mutating domain evidence. Chromium coverage boots both real probe pages,
executes the scenario from each, and compares the domain snapshot, RNG snapshot, and checksum.

No renderer type enters the scenario or toy-domain contracts, and no Foundation public surface is
added by S07-01.


## S07-02 renderer-independent replay verification

S07-02 treats replay as deterministic re-execution of the canonical scenario inputs. It does not
introduce a persisted replay format or new Foundation runtime contract.

The fixture now advances the scenario through the existing Foundation `FixedStepDriver` at a 50 ms
fixed step and records one authoritative checkpoint after each domain tick. Each checkpoint contains
the zero-based canonical tick index, resulting domain tick, commands consumed for that tick, domain
snapshot, RNG snapshot, and fixture-local checksum.

The live Phaser page executes the scenario through a fine-grained frame schedule
(`16/17/17 ms` per fixed tick). The live PlayCanvas page executes the same scenario through a
coarser `33/17 ms` schedule. Both schedules deliver exactly eight fixed ticks without dropped steps.
Renderer and cadence labels are presentation/test metadata only and are excluded from authoritative
comparison.

Replay equivalence requires identical scenario id, seed, tick count, ordered commands, per-tick domain
snapshots, per-tick RNG snapshots, per-tick checksums, final domain snapshot, final RNG snapshot, and
final checksum. Repeated execution is checked independently for both live probes.

The comparison helper reports the first differing tick when a trace diverges and includes the expected
and actual command lists plus checkpoint checksums. This diagnostic remains fixture-local test support;
it is not a general replay framework or public Foundation API.

Transient Phaser 2D and PlayCanvas 3D presentation coordinates are intentionally not compared as
authoritative evidence. The browser test requires those presentation projections to be allowed to
differ while the authoritative replay evidence remains identical.
