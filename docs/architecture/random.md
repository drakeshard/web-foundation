# Deterministic RNG Contract

## Status

Accepted for Web Foundation v0.1.

This document defines the compatibility contract implemented by S01-05. It does not implement the generator.

## Purpose

The Foundation RNG provides deterministic gameplay randomness for simulations, tests, saves, and replay-compatible state.

It is **not cryptographically secure** and MUST NOT be used for authentication, secrets, session identifiers, security tokens, cryptographic nonces, or other security-sensitive randomness.

## Algorithm identity

The v0.1 algorithm identifier is:

```text
xoshiro128starstar-v1
```

The core generator is xoshiro128** with four unsigned 32-bit state words and period `2^128 - 1` for non-zero state.

All arithmetic in the algorithm is defined modulo `2^32`.

JavaScript implementation must use explicit 32-bit operations such as `Math.imul`, bitwise operators, and `>>> 0` normalization. The generator state must not depend on floating-point arithmetic, BigInt, wall-clock time, browser APIs, renderer APIs, or `Math.random()`.

## Core transition

For state words `s0`, `s1`, `s2`, and `s3`, one core draw performs the following unsigned-32-bit operations:

```text
result = rotl32(s1 * 5, 7) * 9
t = s1 << 9

s2 ^= s0
s3 ^= s1
s1 ^= s2
s0 ^= s3

s2 ^= t
s3 = rotl32(s3, 11)

return result
```

Multiplication is modulo `2^32`. Rotation is a 32-bit left rotation.

The implementation in S01-05 must preserve this transition exactly.

## Public algorithm constant

The public random module exposes the algorithm identity as a constant so persisted state and compatibility checks do not rely on an undocumented class implementation.

Conceptually:

```ts
const RNG_ALGORITHM_ID = "xoshiro128starstar-v1";
```

Changing the core transition, output transform, seed expansion, or helper draw-consumption semantics requires a new algorithm identifier.

## Seed contract

The v0.1 constructor accepts one unsigned 32-bit integer seed.

Valid seeds are integer JavaScript numbers in the inclusive range:

```text
0 .. 4294967295
```

Seed `0` is valid.

The implementation MUST reject:

- negative values;
- fractional values;
- `NaN`;
- positive or negative infinity;
- values greater than `0xffffffff`.

The implementation MUST NOT silently truncate, wrap, hash arbitrary strings, read time, or substitute random entropy for invalid seeds.

## Seed expansion

A single 32-bit seed is expanded into the four xoshiro state words using the following versioned `seed32-v1` procedure.

Initialize `x` to the seed. For each of four state words:

1. `x = x + 0x9e3779b9` modulo `2^32`;
2. `z = x`;
3. `z = (z ^ (z >>> 16)) * 0x85ebca6b` modulo `2^32`;
4. `z = (z ^ (z >>> 13)) * 0xc2b2ae35` modulo `2^32`;
5. `z = z ^ (z >>> 16)`;
6. store `z` as the next unsigned 32-bit state word.

If all four expanded words are zero, the implementation MUST set the fourth word to `1` before first use because the all-zero xoshiro state is invalid.

The seed expansion procedure is part of `xoshiro128starstar-v1` compatibility. Changing it requires a new algorithm identifier.

## Public API contract

The v0.1 random surface is intentionally small.

Conceptually:

```ts
interface DeterministicRngState {
  algorithm: "xoshiro128starstar-v1";
  state: readonly [number, number, number, number];
}

class DeterministicRng {
  constructor(seed: number);

  static fromState(state: DeterministicRngState): DeterministicRng;

  nextUint32(): number;
  nextFloat01(): number;
  snapshot(): DeterministicRngState;
}
```

The exact implementation file layout is owned by S01-05, but the behavior above is the accepted v0.1 public contract.

## Sequence semantics

For an identical seed and identical ordered sequence of RNG method calls, outputs MUST be identical across supported browsers and executions.

`nextUint32()`:

- consumes exactly one core generator draw;
- returns an integer in `0 .. 4294967295` inclusive.

`nextFloat01()`:

- consumes exactly one core generator draw by calling the equivalent of `nextUint32()`;
- returns `uint32 / 4294967296`;
- returns a value in `0 <= value < 1`.

`snapshot()`:

- consumes no random draw;
- returns a copy of the current algorithm identifier and four state words;
- must not expose mutable internal state by reference.

`fromState()`:

- consumes no random draw before the first caller request;
- resumes at the exact next output represented by the snapshot;
- MUST reject an algorithm identifier it does not implement;
- MUST reject non-integer/out-of-range state words;
- MUST reject the all-zero state.

The ordered RNG call sequence is therefore compatibility-sensitive. Replacing one helper call with another helper that consumes a different number of core draws can change later gameplay outcomes even when the seed is unchanged.

## Snapshot and restore requirement

State snapshot/restore is required in v0.1.

The concrete roadmap includes persistence, deterministic simulation tests, and replay-compatible behavior. Persisting only the original seed is insufficient for restoring a simulation after an arbitrary number of draws unless every prior draw is replayed.

A saved game that needs RNG continuity may persist the RNG snapshot inside its game-owned payload. Foundation storage does not implicitly persist RNG state.

The snapshot includes the algorithm identifier so loads can detect an incompatible RNG implementation explicitly.

## Helpers intentionally included

v0.1 includes only:

- `nextUint32()`;
- `nextFloat01()`;
- snapshot/state restoration.

These have direct deterministic-testing and simulation utility without adding game-policy semantics.

## Helpers deferred

The following are deliberately deferred until a current consumer demonstrates the required semantics:

- bounded integer ranges;
- inclusive ranges;
- booleans/chance helpers;
- weighted selection;
- shuffle/sample helpers;
- Gaussian/normal distributions;
- random strings/ids;
- independent stream splitting;
- jump/long-jump APIs.

When a helper is later added, its range semantics, bias behavior, and exact number of consumed core draws become part of its compatibility contract.

A bounded-integer helper MUST NOT be added using modulo reduction unless bias is explicitly accepted by a separate contract.

## Persistence and replay compatibility

Once a game save, replay, deterministic test vector, or network protocol depends on this RNG:

- the algorithm identifier MUST be persisted or otherwise known by the compatibility layer;
- state words MUST be treated as compatibility data;
- the algorithm transition and seed expansion MUST NOT change under the same identifier;
- golden-vector tests MUST protect seed-to-sequence behavior;
- snapshot/restore tests MUST protect continuation behavior.

A future algorithm may coexist under a new identifier. Existing persisted state must not be silently interpreted using a different algorithm.

## Determinism boundary

The RNG guarantees deterministic output only for identical initial RNG state and identical ordered RNG calls.

It does not make an entire simulation deterministic by itself. Determinism also requires stable simulation tick order, stable ordered inputs, stable game logic, and no uncontrolled wall-clock or external nondeterministic state.

## Deferred decisions

The following are not part of S01-04:

- cryptographic randomness;
- secure server-side randomness;
- anti-cheat or fairness protocols;
- random stream partitioning per subsystem;
- rollback/network synchronization;
- content-generation-specific helper libraries.

Those require a current consumer or later architecture decision.
