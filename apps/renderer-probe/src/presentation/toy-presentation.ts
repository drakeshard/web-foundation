import type { ToyDomainState } from "../domain/index.js";

export const TOY_MARKER_VIEW_ID = "marker" as const;

export interface ToyPresentationPoint {
  readonly x: number;
  readonly y: number;
}

export type ToyPresentationView =
  | {
      readonly viewId: string;
      readonly kind: "probe";
      readonly domainEntityId: string;
      readonly position: ToyPresentationPoint;
    }
  | {
      readonly viewId: typeof TOY_MARKER_VIEW_ID;
      readonly kind: "marker";
      readonly position: ToyPresentationPoint;
    };

export function projectToyPresentation(
  state: ToyDomainState,
  alpha: number,
): readonly ToyPresentationView[] {
  return [
    {
      viewId: `probe:${state.probe.id}`,
      kind: "probe",
      domainEntityId: state.probe.id,
      position: {
        x: interpolate(state.probe.previousPosition.x, state.probe.position.x, alpha),
        y: interpolate(state.probe.previousPosition.y, state.probe.position.y, alpha),
      },
    },
    {
      viewId: TOY_MARKER_VIEW_ID,
      kind: "marker",
      position: {
        x: state.marker.position.x,
        y: state.marker.position.y,
      },
    },
  ];
}

function interpolate(previous: number, current: number, alpha: number): number {
  return previous + (current - previous) * alpha;
}
