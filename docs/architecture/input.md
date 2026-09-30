# Browser Input Boundary Contract

## Status

Accepted S02-01 contract for the Web Foundation v0.1 browser input boundary.

## Boundary

Browser input is asynchronous physical data. It is not authoritative game/domain state.

Browser adapters normalize browser events into plain Foundation records. Raw DOM event objects, browser timestamps, renderer objects, and renderer/world-coordinate types must never enter deterministic action or simulation contracts.

Foundation input is renderer-neutral. Phaser, PlayCanvas, canvas-specific input systems, and screen-to-world conversion remain presentation-local.

## Physical identity and state

Keyboard identity uses standard `KeyboardEvent.code` semantics represented as opaque strings. Foundation does not define gameplay meaning for a key code.

Pointer records use browser Pointer Events concepts:

- `pointerId` identifies one active pointer interaction;
- `pointerType` is normalized to `mouse`, `pen`, `touch`, or `unknown`;
- button identity is the browser pointer button number;
- absolute position is viewport CSS pixels equivalent to `clientX`/`clientY`.

v0.1 does not require pointer movement deltas in the shared contract. A current consumer may justify adding them later.

Digital held state belongs to the physical boundary. A pressed edge is emitted only for a not-held → held transition. A released edge is emitted only for a held → not-held transition. Repeated keydown while a key is already held does not create another pressed edge.

## Deterministic ordering

Every normalized physical record carries an `InputSequence`: a non-negative safe integer from one monotonically increasing sequence source shared by every adapter feeding the same input pipeline.

`InputSequence` order is authoritative when multiple physical changes occur between simulation ticks. Adapters and later mapping/tick stages must not order deterministic input by `Event.timeStamp`, `performance.now()`, wall-clock time, renderer frame time, or listener type.

Multiple edges may occur between two simulation ticks. Their sequence order must be preserved even when the final held state matches the state at the previous tick.

## Wheel semantics

Wheel records preserve browser `deltaX`, `deltaY`, and `deltaZ` sign and magnitude and normalize `deltaMode` into an explicit unit:

- `pixel`;
- `line`;
- `page`.

Foundation does not convert between those units, invent a scale factor, or invert signs. A consumer that needs a policy for line/page magnitude must define that policy outside the physical adapter contract.

## Cancellation and reset

Pointer cancellation or lost pointer interaction clears held buttons for the affected pointer and emits a pointer-cancel record. Cancellation is invalidation, not user intent, so it does not fabricate released edges.

Window blur, hidden-document visibility, and adapter detach clear applicable physical held state and emit a scoped reset record. The reset scope is explicitly `keyboard`, `pointer`, or `all`, so adapter-local cleanup cannot accidentally invalidate unrelated physical state. Reset is invalidation, not gameplay intent; it must not fabricate logical release commands or other game actions.

Resume or re-attach starts from cleared physical state. Input accumulated while hidden or detached is not replayed.

## Logical actions

A `LogicalActionId` is an opaque, game-owned string. Foundation defines no Move, Attack, Inventory, or other game-specific action catalog.

Action resolution is responsible for deriving:

- final logical held state;
- ordered pressed/released action transitions.

The tick-consumption layer will later expose final held state with one-tick edge flags and ordered command/intention data. If both press and release occur between two ticks, both edge flags may be true for that tick while `held` reflects the final resolved state.

S02-01 defines this behavior contract but does not implement action mapping, contexts, or tick consumption.

## Command/intention representation

`InputCommand` is generic deterministic data with:

- a game-owned command identifier;
- the originating `InputSequence`;
- game-owned payload data.

Command payloads entering deterministic code must be plain deterministic data. They must not contain DOM events, renderer objects, functions, or uncontrolled wall-clock/browser timing values.

## Ownership

The input pipeline owns responsibilities in this order:

1. **Browser adapter** — listener lifecycle, physical normalization, physical held state, normalized record delivery.
2. **Action mapping** — physical binding to logical action resolution.
3. **Input contexts** — generic logical-action ownership, precedence, and consumption.
4. **Tick handoff** — deterministic per-tick snapshots and ordered command delivery.
5. **Simulation/domain** — consumes only logical/tick data.

Presentation owns renderer interaction and coordinate conversion. Simulation/domain code never reads DOM events directly.

## Deferred work

Dedicated later issues own:

- action mapping and binding resolution;
- input contexts;
- tick snapshots and command queues;
- centralized lifecycle/reset coordination beyond adapter-local stuck-state cleanup;
- real-browser integration tests;
- renderer adapters;
- Preact integration;
- gamepad;
- persistence;
- game-specific controls.
