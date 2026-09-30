export const TOY_WORLD_WIDTH = 8;
export const TOY_WORLD_HEIGHT = 8;
export const TOY_PROBE_ID = "probe" as const;

const UINT32_RANGE = 0x1_0000_0000;
const TOY_RAMP_START_X = 2;
const TOY_RAMP_END_X = 4;
const TOY_HIGH_ELEVATION = 1;

export type ToyAxisStep = -1 | 0 | 1;

export interface ToyPoint {
  readonly x: number;
  readonly y: number;
}

export interface ToyWorld {
  readonly width: number;
  readonly height: number;
}

export interface ToyProbeState {
  readonly id: typeof TOY_PROBE_ID;
  readonly previousPosition: ToyPoint;
  readonly position: ToyPoint;
}

export interface ToyMarkerState {
  readonly position: ToyPoint;
}

export interface ToyDomainState {
  readonly tick: number;
  readonly world: ToyWorld;
  readonly probe: ToyProbeState;
  readonly marker: ToyMarkerState;
}

export type ToyDomainCommand =
  | {
      readonly type: "move";
      readonly dx: ToyAxisStep;
      readonly dy: ToyAxisStep;
    }
  | {
      readonly type: "set-marker";
      readonly position: ToyPoint;
    }
  | {
      readonly type: "randomize-marker";
    };

export type ToyDomainEvent =
  | {
      readonly type: "probe-moved";
      readonly from: ToyPoint;
      readonly to: ToyPoint;
    }
  | {
      readonly type: "marker-set";
      readonly position: ToyPoint;
      readonly source: "command" | "random";
    };

export interface ToyDomainSnapshot {
  readonly tick: number;
  readonly world: ToyWorld;
  readonly probe: {
    readonly id: typeof TOY_PROBE_ID;
    readonly position: ToyPoint;
  };
  readonly marker: {
    readonly position: ToyPoint;
  };
}

export interface ToyDomainRandom {
  nextUint32(): number;
}

export interface ToyDomainTickResult {
  readonly state: ToyDomainState;
  readonly events: readonly ToyDomainEvent[];
}

export function getToyElevation(point: ToyPoint): number {
  if (point.x <= TOY_RAMP_START_X) return 0;
  if (point.x >= TOY_RAMP_END_X) return TOY_HIGH_ELEVATION;

  return ((point.x - TOY_RAMP_START_X) / (TOY_RAMP_END_X - TOY_RAMP_START_X)) * TOY_HIGH_ELEVATION;
}

export function createToyDomainState(): ToyDomainState {
  const probePosition = { x: 3, y: 3 };

  return {
    tick: 0,
    world: {
      width: TOY_WORLD_WIDTH,
      height: TOY_WORLD_HEIGHT,
    },
    probe: {
      id: TOY_PROBE_ID,
      previousPosition: copyPoint(probePosition),
      position: copyPoint(probePosition),
    },
    marker: {
      position: { x: 1, y: 1 },
    },
  };
}

export function advanceToyDomain(
  state: ToyDomainState,
  commands: readonly ToyDomainCommand[],
  random: ToyDomainRandom,
): ToyDomainTickResult {
  const previousPosition = copyPoint(state.probe.position);
  let probePosition = copyPoint(state.probe.position);
  let markerPosition = copyPoint(state.marker.position);
  const events: ToyDomainEvent[] = [];

  for (const command of commands) {
    switch (command.type) {
      case "move": {
        const nextPosition = clampPoint(
          {
            x: probePosition.x + command.dx,
            y: probePosition.y + command.dy,
          },
          state.world,
        );

        if (!pointsEqual(nextPosition, probePosition)) {
          events.push({
            type: "probe-moved",
            from: copyPoint(probePosition),
            to: copyPoint(nextPosition),
          });
          probePosition = nextPosition;
        }
        break;
      }
      case "set-marker": {
        markerPosition = clampPoint(command.position, state.world);
        events.push({
          type: "marker-set",
          position: copyPoint(markerPosition),
          source: "command",
        });
        break;
      }
      case "randomize-marker": {
        markerPosition = {
          x: sampleWorldCoordinate(random, state.world.width),
          y: sampleWorldCoordinate(random, state.world.height),
        };
        events.push({
          type: "marker-set",
          position: copyPoint(markerPosition),
          source: "random",
        });
        break;
      }
    }
  }

  return {
    state: {
      tick: state.tick + 1,
      world: {
        width: state.world.width,
        height: state.world.height,
      },
      probe: {
        id: state.probe.id,
        previousPosition,
        position: probePosition,
      },
      marker: {
        position: markerPosition,
      },
    },
    events,
  };
}

export function snapshotToyDomain(state: ToyDomainState): ToyDomainSnapshot {
  return {
    tick: state.tick,
    world: {
      width: state.world.width,
      height: state.world.height,
    },
    probe: {
      id: state.probe.id,
      position: copyPoint(state.probe.position),
    },
    marker: {
      position: copyPoint(state.marker.position),
    },
  };
}

export function restoreToyDomain(snapshot: ToyDomainSnapshot): ToyDomainState {
  const position = copyPoint(snapshot.probe.position);

  return {
    tick: snapshot.tick,
    world: {
      width: snapshot.world.width,
      height: snapshot.world.height,
    },
    probe: {
      id: snapshot.probe.id,
      previousPosition: copyPoint(position),
      position,
    },
    marker: {
      position: copyPoint(snapshot.marker.position),
    },
  };
}

function sampleWorldCoordinate(random: ToyDomainRandom, size: number): number {
  return Math.floor((random.nextUint32() / UINT32_RANGE) * size);
}

function clampPoint(point: ToyPoint, world: ToyWorld): ToyPoint {
  return {
    x: clamp(point.x, 0, world.width - 1),
    y: clamp(point.y, 0, world.height - 1),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function copyPoint(point: ToyPoint): ToyPoint {
  return { x: point.x, y: point.y };
}

function pointsEqual(left: ToyPoint, right: ToyPoint): boolean {
  return left.x === right.x && left.y === right.y;
}
