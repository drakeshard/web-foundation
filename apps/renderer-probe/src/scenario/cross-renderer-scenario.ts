import { DeterministicRng, type DeterministicRngState } from "@drakeshard/foundation/random";
import { FixedStepDriver } from "@drakeshard/foundation/time";
import {
  advanceToyDomain,
  createToyDomainState,
  restoreToyDomain,
  snapshotToyDomain,
  type ToyDomainCommand,
  type ToyDomainSnapshot,
  type ToyDomainState,
} from "../domain/index.js";

const STEP_MS = 50;
const MAX_FRAME_DELTA_MS = 250;
const MAX_STEPS_PER_FRAME = 5;

const COMMANDS_BY_TICK = [
  [{ type: "move", dx: 1, dy: 0 }],
  [{ type: "randomize-marker" }],
  [
    { type: "move", dx: 0, dy: -1 },
    { type: "set-marker", position: { x: 6, y: 5 } },
  ],
  [],
  [{ type: "move", dx: -1, dy: 0 }],
  [{ type: "randomize-marker" }],
  [{ type: "move", dx: 0, dy: 1 }],
  [{ type: "move", dx: 1, dy: 0 }],
] satisfies readonly (readonly ToyDomainCommand[])[];

export const CROSS_RENDERER_SCENARIO = {
  id: "s07-cross-renderer-v1",
  initialDomain: snapshotToyDomain(createToyDomainState()),
  seed: 0x0701_cafe,
  tickCount: COMMANDS_BY_TICK.length,
  commandsByTick: COMMANDS_BY_TICK,
} as const;

export const CROSS_RENDERER_FRAME_SCHEDULES = {
  steady: [50, 50, 50, 50, 50, 50, 50, 50],
  fine: [
    16, 17, 17, 16, 17, 17, 16, 17, 17, 16, 17, 17, 16, 17, 17, 16, 17, 17, 16, 17, 17,
    16, 17, 17,
  ],
  coarse: [33, 17, 33, 17, 33, 17, 33, 17, 33, 17, 33, 17, 33, 17, 33, 17],
} as const;

export interface CrossRendererScenarioRunOptions {
  readonly frameDeltasMs?: readonly number[];
}

export interface CrossRendererScenarioTraceEntry {
  readonly tickIndex: number;
  readonly domainTick: number;
  readonly commands: readonly ToyDomainCommand[];
  readonly domain: ToyDomainSnapshot;
  readonly random: DeterministicRngState;
  readonly checksum: string;
}

export interface CrossRendererScenarioResult {
  readonly scenarioId: typeof CROSS_RENDERER_SCENARIO.id;
  readonly seed: number;
  readonly tickCount: number;
  readonly finalState: ToyDomainState;
  readonly finalDomain: ToyDomainSnapshot;
  readonly random: DeterministicRngState;
  readonly checksum: string;
  readonly trace: readonly CrossRendererScenarioTraceEntry[];
}

export type CrossRendererReplayDivergence =
  | {
      readonly kind: "metadata";
      readonly message: string;
    }
  | {
      readonly kind: "trace-length" | "commands" | "authoritative-state" | "checksum";
      readonly tickIndex: number;
      readonly domainTick: number | null;
      readonly expectedCommands: readonly ToyDomainCommand[];
      readonly actualCommands: readonly ToyDomainCommand[];
      readonly expectedChecksum: string | null;
      readonly actualChecksum: string | null;
      readonly message: string;
    };

export type CrossRendererReplayComparison =
  | { readonly ok: true }
  | { readonly ok: false; readonly divergence: CrossRendererReplayDivergence };

export function runCrossRendererScenario(
  options: CrossRendererScenarioRunOptions = {},
): CrossRendererScenarioResult {
  const frameDeltasMs = options.frameDeltasMs ?? CROSS_RENDERER_FRAME_SCHEDULES.steady;
  const driver = new FixedStepDriver({
    stepMs: STEP_MS,
    maxFrameDeltaMs: MAX_FRAME_DELTA_MS,
    maxStepsPerFrame: MAX_STEPS_PER_FRAME,
  });
  const random = new DeterministicRng(CROSS_RENDERER_SCENARIO.seed);
  const trace: CrossRendererScenarioTraceEntry[] = [];
  let state = restoreToyDomain(CROSS_RENDERER_SCENARIO.initialDomain);
  let tickIndex = 0;

  for (const frameDeltaMs of frameDeltasMs) {
    const frame = driver.advance(frameDeltaMs);

    if (frame.droppedSteps > 0) {
      throw new Error(
        `Cross-renderer scenario frame schedule dropped ${frame.droppedSteps} fixed steps`,
      );
    }

    for (let step = 0; step < frame.steps; step += 1) {
      const commands = CROSS_RENDERER_SCENARIO.commandsByTick[tickIndex];

      if (!commands) {
        throw new Error(
          `Cross-renderer scenario frame schedule advanced beyond tick ${CROSS_RENDERER_SCENARIO.tickCount}`,
        );
      }

      state = advanceToyDomain(state, commands, random).state;
      const domain = snapshotToyDomain(state);
      const randomState = random.snapshot();

      trace.push({
        tickIndex,
        domainTick: domain.tick,
        commands,
        domain,
        random: randomState,
        checksum: checksumScenarioResult(domain, randomState),
      });
      tickIndex += 1;
    }
  }

  if (tickIndex !== CROSS_RENDERER_SCENARIO.tickCount) {
    throw new Error(
      `Cross-renderer scenario frame schedule executed ${tickIndex} of ${CROSS_RENDERER_SCENARIO.tickCount} ticks`,
    );
  }

  const finalDomain = snapshotToyDomain(state);
  const randomState = random.snapshot();

  return {
    scenarioId: CROSS_RENDERER_SCENARIO.id,
    seed: CROSS_RENDERER_SCENARIO.seed,
    tickCount: CROSS_RENDERER_SCENARIO.tickCount,
    finalState: state,
    finalDomain,
    random: randomState,
    checksum: checksumScenarioResult(finalDomain, randomState),
    trace,
  };
}

export function compareCrossRendererScenarioResults(
  expected: CrossRendererScenarioResult,
  actual: CrossRendererScenarioResult,
): CrossRendererReplayComparison {
  if (
    expected.scenarioId !== actual.scenarioId ||
    expected.seed !== actual.seed ||
    expected.tickCount !== actual.tickCount
  ) {
    return {
      ok: false,
      divergence: {
        kind: "metadata",
        message: `Replay metadata differs: expected ${expected.scenarioId}/${expected.seed}/${expected.tickCount}, received ${actual.scenarioId}/${actual.seed}/${actual.tickCount}`,
      },
    };
  }

  const traceLength = Math.max(expected.trace.length, actual.trace.length);

  for (let tickIndex = 0; tickIndex < traceLength; tickIndex += 1) {
    const expectedEntry = expected.trace[tickIndex];
    const actualEntry = actual.trace[tickIndex];

    if (!expectedEntry || !actualEntry) {
      return {
        ok: false,
        divergence: {
          kind: "trace-length",
          tickIndex,
          domainTick: expectedEntry?.domainTick ?? actualEntry?.domainTick ?? null,
          expectedCommands: expectedEntry?.commands ?? [],
          actualCommands: actualEntry?.commands ?? [],
          expectedChecksum: expectedEntry?.checksum ?? null,
          actualChecksum: actualEntry?.checksum ?? null,
          message: `Replay trace length diverged at tick index ${tickIndex}`,
        },
      };
    }

    if (JSON.stringify(expectedEntry.commands) !== JSON.stringify(actualEntry.commands)) {
      return {
        ok: false,
        divergence: {
          kind: "commands",
          tickIndex,
          domainTick: expectedEntry.domainTick,
          expectedCommands: expectedEntry.commands,
          actualCommands: actualEntry.commands,
          expectedChecksum: expectedEntry.checksum,
          actualChecksum: actualEntry.checksum,
          message: `Replay command divergence at tick index ${tickIndex} (domain tick ${expectedEntry.domainTick})`,
        },
      };
    }

    if (
      JSON.stringify(expectedEntry.domain) !== JSON.stringify(actualEntry.domain) ||
      JSON.stringify(expectedEntry.random) !== JSON.stringify(actualEntry.random)
    ) {
      return {
        ok: false,
        divergence: {
          kind: "authoritative-state",
          tickIndex,
          domainTick: expectedEntry.domainTick,
          expectedCommands: expectedEntry.commands,
          actualCommands: actualEntry.commands,
          expectedChecksum: expectedEntry.checksum,
          actualChecksum: actualEntry.checksum,
          message: `Replay authoritative state diverged at tick index ${tickIndex} (domain tick ${expectedEntry.domainTick})`,
        },
      };
    }

    if (expectedEntry.checksum !== actualEntry.checksum) {
      return {
        ok: false,
        divergence: {
          kind: "checksum",
          tickIndex,
          domainTick: expectedEntry.domainTick,
          expectedCommands: expectedEntry.commands,
          actualCommands: actualEntry.commands,
          expectedChecksum: expectedEntry.checksum,
          actualChecksum: actualEntry.checksum,
          message: `Replay checksum diverged at tick index ${tickIndex} (domain tick ${expectedEntry.domainTick})`,
        },
      };
    }
  }

  return { ok: true };
}

function checksumScenarioResult(
  domain: ToyDomainSnapshot,
  random: DeterministicRngState,
): string {
  const serialized = JSON.stringify({ domain, random });
  let hash = 0x811c_9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x0100_0193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}
