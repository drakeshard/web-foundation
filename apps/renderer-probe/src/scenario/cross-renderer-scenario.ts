import { DeterministicRng, type DeterministicRngState } from "@drakeshard/foundation/random";
import {
  advanceToyDomain,
  createToyDomainState,
  restoreToyDomain,
  snapshotToyDomain,
  type ToyDomainCommand,
  type ToyDomainSnapshot,
  type ToyDomainState,
} from "../domain/index.js";

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

export interface CrossRendererScenarioResult {
  readonly scenarioId: typeof CROSS_RENDERER_SCENARIO.id;
  readonly seed: number;
  readonly tickCount: number;
  readonly finalState: ToyDomainState;
  readonly finalDomain: ToyDomainSnapshot;
  readonly random: DeterministicRngState;
  readonly checksum: string;
}

export function runCrossRendererScenario(): CrossRendererScenarioResult {
  const random = new DeterministicRng(CROSS_RENDERER_SCENARIO.seed);
  let state = restoreToyDomain(CROSS_RENDERER_SCENARIO.initialDomain);

  for (const commands of CROSS_RENDERER_SCENARIO.commandsByTick) {
    state = advanceToyDomain(state, commands, random).state;
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
  };
}

function checksumScenarioResult(domain: ToyDomainSnapshot, random: DeterministicRngState): string {
  const serialized = JSON.stringify({ domain, random });
  let hash = 0x811c_9dc5;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x0100_0193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}
