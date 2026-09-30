import type { ScreenPosition } from "@drakeshard/foundation/input";
import type { CameraComponent } from "playcanvas";
import { getToyElevation, type ToyDomainState, type ToyPoint } from "../domain/index.js";

const EPSILON = 1e-9;
const CELL_HALF_SIZE = 0.5;
const PROBE_HALF_EXTENTS = {
  x: 0.35,
  y: 0.5,
  z: 0.35,
} as const;

type PlayCanvasCameraProjector = Pick<CameraComponent, "nearClip" | "farClip" | "screenToWorld">;

export interface PlayCanvasWorldVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PlayCanvasWorldRay {
  readonly origin: PlayCanvasWorldVector;
  readonly direction: PlayCanvasWorldVector;
  readonly maxDistance: number;
}

export type PlayCanvasPointerInteraction =
  | {
      readonly kind: "intersection";
      readonly point: ToyPoint;
      readonly worldPosition: PlayCanvasWorldVector;
      readonly distance: number;
    }
  | {
      readonly kind: "occluded";
      readonly occluderViewId: string;
      readonly domainEntityId: string;
      readonly worldPosition: PlayCanvasWorldVector;
      readonly distance: number;
    }
  | {
      readonly kind: "miss";
      readonly reason: "outside-canvas" | "invalid-ray" | "no-world-intersection";
    };

export function resolvePlayCanvasPointerInteraction(
  position: ScreenPosition,
  canvas: HTMLCanvasElement,
  camera: PlayCanvasCameraProjector,
  state: ToyDomainState,
): PlayCanvasPointerInteraction {
  const rayResult = createPlayCanvasWorldRay(position, canvas, camera);

  if (rayResult.kind === "miss") return rayResult;

  return pickToyWorldFromRay(rayResult.ray, state);
}

export function pickToyWorldFromRay(
  ray: PlayCanvasWorldRay,
  state: ToyDomainState,
): PlayCanvasPointerInteraction {
  const terrainIntersection = findNearestTerrainIntersection(ray, state);
  const probeIntersection = intersectProbe(ray, state);

  if (
    probeIntersection &&
    (!terrainIntersection || probeIntersection.distance <= terrainIntersection.distance + EPSILON)
  ) {
    return {
      kind: "occluded",
      occluderViewId: `probe:${state.probe.id}`,
      domainEntityId: state.probe.id,
      worldPosition: probeIntersection.worldPosition,
      distance: probeIntersection.distance,
    };
  }

  return (
    terrainIntersection ?? {
      kind: "miss",
      reason: "no-world-intersection",
    }
  );
}

function createPlayCanvasWorldRay(
  position: ScreenPosition,
  canvas: HTMLCanvasElement,
  camera: PlayCanvasCameraProjector,
):
  | {
      readonly kind: "ray";
      readonly ray: PlayCanvasWorldRay;
    }
  | Extract<PlayCanvasPointerInteraction, { readonly kind: "miss" }> {
  const bounds = canvas.getBoundingClientRect();

  if (bounds.width <= 0 || bounds.height <= 0) {
    return { kind: "miss", reason: "outside-canvas" };
  }

  const screenX = position.x - bounds.left;
  const screenY = position.y - bounds.top;

  if (screenX < 0 || screenY < 0 || screenX > bounds.width || screenY > bounds.height) {
    return { kind: "miss", reason: "outside-canvas" };
  }

  const start = camera.screenToWorld(screenX, screenY, camera.nearClip);
  const end = camera.screenToWorld(screenX, screenY, camera.farClip);
  const delta = {
    x: end.x - start.x,
    y: end.y - start.y,
    z: end.z - start.z,
  };
  const maxDistance = Math.hypot(delta.x, delta.y, delta.z);

  if (!Number.isFinite(maxDistance) || maxDistance <= EPSILON) {
    return { kind: "miss", reason: "invalid-ray" };
  }

  return {
    kind: "ray",
    ray: {
      origin: { x: start.x, y: start.y, z: start.z },
      direction: {
        x: delta.x / maxDistance,
        y: delta.y / maxDistance,
        z: delta.z / maxDistance,
      },
      maxDistance,
    },
  };
}

function findNearestTerrainIntersection(
  ray: PlayCanvasWorldRay,
  state: ToyDomainState,
): Extract<PlayCanvasPointerInteraction, { readonly kind: "intersection" }> | undefined {
  let nearest: Extract<PlayCanvasPointerInteraction, { readonly kind: "intersection" }> | undefined;

  if (Math.abs(ray.direction.y) <= EPSILON) return nearest;

  for (let x = 0; x < state.world.width; x += 1) {
    for (let y = 0; y < state.world.height; y += 1) {
      const point = { x, y };
      const elevation = getToyElevation(point);
      const distance = (elevation - ray.origin.y) / ray.direction.y;

      if (distance < 0 || distance > ray.maxDistance) continue;

      const worldPosition = pointOnRay(ray, distance);

      if (
        worldPosition.x < x - CELL_HALF_SIZE - EPSILON ||
        worldPosition.x > x + CELL_HALF_SIZE + EPSILON ||
        worldPosition.z < y - CELL_HALF_SIZE - EPSILON ||
        worldPosition.z > y + CELL_HALF_SIZE + EPSILON
      ) {
        continue;
      }

      if (!nearest || distance < nearest.distance) {
        nearest = {
          kind: "intersection",
          point,
          worldPosition,
          distance,
        };
      }
    }
  }

  return nearest;
}

function intersectProbe(
  ray: PlayCanvasWorldRay,
  state: ToyDomainState,
):
  | {
      readonly worldPosition: PlayCanvasWorldVector;
      readonly distance: number;
    }
  | undefined {
  const elevation = getToyElevation(state.probe.position);
  const center = {
    x: state.probe.position.x,
    y: elevation + 0.5,
    z: state.probe.position.y,
  };
  const distance = intersectRayAabb(
    ray,
    {
      x: center.x - PROBE_HALF_EXTENTS.x,
      y: center.y - PROBE_HALF_EXTENTS.y,
      z: center.z - PROBE_HALF_EXTENTS.z,
    },
    {
      x: center.x + PROBE_HALF_EXTENTS.x,
      y: center.y + PROBE_HALF_EXTENTS.y,
      z: center.z + PROBE_HALF_EXTENTS.z,
    },
  );

  if (distance === undefined) return undefined;

  return {
    worldPosition: pointOnRay(ray, distance),
    distance,
  };
}

function intersectRayAabb(
  ray: PlayCanvasWorldRay,
  minimum: PlayCanvasWorldVector,
  maximum: PlayCanvasWorldVector,
): number | undefined {
  let near = 0;
  let far = ray.maxDistance;

  for (const axis of ["x", "y", "z"] as const) {
    const origin = ray.origin[axis];
    const direction = ray.direction[axis];

    if (Math.abs(direction) <= EPSILON) {
      if (origin < minimum[axis] || origin > maximum[axis]) return undefined;
      continue;
    }

    const first = (minimum[axis] - origin) / direction;
    const second = (maximum[axis] - origin) / direction;
    const axisNear = Math.min(first, second);
    const axisFar = Math.max(first, second);
    near = Math.max(near, axisNear);
    far = Math.min(far, axisFar);

    if (far < near) return undefined;
  }

  return near <= ray.maxDistance ? near : undefined;
}

function pointOnRay(ray: PlayCanvasWorldRay, distance: number): PlayCanvasWorldVector {
  return {
    x: ray.origin.x + ray.direction.x * distance,
    y: ray.origin.y + ray.direction.y * distance,
    z: ray.origin.z + ray.direction.z * distance,
  };
}
