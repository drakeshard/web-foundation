export {
  TOY_PROBE_ID,
  TOY_WORLD_HEIGHT,
  TOY_WORLD_WIDTH,
  advanceToyDomain,
  createToyDomainState,
  restoreToyDomain,
  snapshotToyDomain,
} from "./toy-domain.js";

export type {
  ToyAxisStep,
  ToyDomainCommand,
  ToyDomainEvent,
  ToyDomainRandom,
  ToyDomainSnapshot,
  ToyDomainState,
  ToyDomainTickResult,
  ToyMarkerState,
  ToyPoint,
  ToyProbeState,
  ToyWorld,
} from "./toy-domain.js";
