import type { ScreenPosition } from "@drakeshard/foundation/input";
import {
  Application,
  Color,
  Entity,
  FILLMODE_NONE,
  PROJECTION_ORTHOGRAPHIC,
  RESOLUTION_FIXED,
} from "playcanvas";
import { getToyElevation, type ToyDomainState } from "../domain/index.js";
import {
  type PlayCanvasPointerInteraction,
  resolvePlayCanvasPointerInteraction,
} from "./playcanvas-interaction.js";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const CELL_SIZE = 1;
const CAMERA_MIN_ORTHO_HEIGHT = 3;
const CAMERA_MAX_ORTHO_HEIGHT = 10;
const CAMERA_ZOOM_RATE = 0.0015;

export interface PlayCanvasPresentationView {
  readonly viewId: string;
  readonly kind: "probe" | "marker";
  readonly domainEntityId?: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

export interface PlayCanvasCameraState {
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly target: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly orthoHeight: number;
}

export interface PlayCanvasProbeOptions {
  readonly parent: HTMLElement;
  readonly readState: () => ToyDomainState;
  readonly onReady?: (canvas: HTMLCanvasElement) => void;
  readonly onCameraChanged?: (state: PlayCanvasCameraState) => void;
}

export interface PlayCanvasProbe {
  readonly app: Application;
  readonly canvas: HTMLCanvasElement;
  rebuildPresentation(state?: ToyDomainState): void;
  resolvePointerInteraction(
    position: ScreenPosition,
    state?: ToyDomainState,
  ): PlayCanvasPointerInteraction;
  readCameraState(): PlayCanvasCameraState;
  destroy(): void;
}

export function projectToyStateToPlayCanvas(
  state: ToyDomainState,
  alpha = 1,
): readonly PlayCanvasPresentationView[] {
  const interpolationAlpha = clamp(alpha, 0, 1);
  const probePosition = {
    x: interpolate(state.probe.previousPosition.x, state.probe.position.x, interpolationAlpha),
    y: interpolate(state.probe.previousPosition.y, state.probe.position.y, interpolationAlpha),
  };
  const probeElevation = interpolate(
    getToyElevation(state.probe.previousPosition),
    getToyElevation(state.probe.position),
    interpolationAlpha,
  );
  const markerElevation = getToyElevation(state.marker.position);

  return [
    {
      viewId: `probe:${state.probe.id}`,
      kind: "probe",
      domainEntityId: state.probe.id,
      position: {
        x: probePosition.x * CELL_SIZE,
        y: probeElevation + 0.5,
        z: probePosition.y * CELL_SIZE,
      },
    },
    {
      viewId: "marker",
      kind: "marker",
      position: {
        x: state.marker.position.x * CELL_SIZE,
        y: markerElevation + 0.25,
        z: state.marker.position.y * CELL_SIZE,
      },
    },
  ];
}

export function createPlayCanvasProbe(options: PlayCanvasProbeOptions): PlayCanvasProbe {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "PlayCanvas renderer probe");
  options.parent.replaceChildren(canvas);

  const app = new Application(canvas);
  app.setCanvasFillMode(FILLMODE_NONE, CANVAS_WIDTH, CANVAS_HEIGHT);
  app.setCanvasResolution(RESOLUTION_FIXED, CANVAS_WIDTH, CANVAS_HEIGHT);

  const initialState = options.readState();
  const camera = new Entity("TacticalCamera");
  camera.addComponent("camera", {
    clearColor: new Color(0.08, 0.11, 0.16),
    projection: PROJECTION_ORTHOGRAPHIC,
    orthoHeight: 6,
  });
  const cameraComponent = camera.camera;

  if (!cameraComponent) {
    throw new Error("PlayCanvas tactical camera component was not created");
  }

  const tacticalCamera = cameraComponent;
  const cameraPosition = { x: 8.5, y: 9, z: 8.5 };
  const cameraTarget = {
    x: (initialState.world.width - 1) / 2,
    y: 0,
    z: (initialState.world.height - 1) / 2,
  };

  applyCameraPose();
  app.root.addChild(camera);

  const light = new Entity("KeyLight");
  light.addComponent("light", {
    type: "directional",
    color: new Color(1, 0.96, 0.88),
    intensity: 2,
  });
  light.setEulerAngles(50, 35, 0);
  app.root.addChild(light);

  const ground = new Entity("Ground");
  ground.addComponent("render", { type: "box" });
  ground.setPosition(3.5, -0.08, 3.5);
  ground.setLocalScale(8, 0.15, 8);
  app.root.addChild(ground);

  let presentationRoot: Entity | undefined;
  let dragPointerId: number | undefined;
  let lastDragPosition: { readonly x: number; readonly y: number } | undefined;

  function rebuildPresentation(state = options.readState()): void {
    presentationRoot?.destroy();
    presentationRoot = new Entity("ToyPresentation");

    for (const view of projectToyStateToPlayCanvas(state)) {
      const entity = new Entity(view.viewId);
      entity.addComponent("render", {
        type: view.kind === "probe" ? "box" : "sphere",
      });
      entity.setPosition(view.position.x, view.position.y, view.position.z);
      entity.setLocalScale(
        view.kind === "probe" ? 0.7 : 0.35,
        view.kind === "probe" ? 1 : 0.35,
        view.kind === "probe" ? 0.7 : 0.35,
      );
      entity.tags.add(`presentation-view:${view.viewId}`);
      if (view.domainEntityId) {
        entity.tags.add(`domain-entity:${view.domainEntityId}`);
      }
      presentationRoot.addChild(entity);
    }

    app.root.addChild(presentationRoot);
  }

  function readCameraState(): PlayCanvasCameraState {
    return {
      position: { ...cameraPosition },
      target: { ...cameraTarget },
      orthoHeight: tacticalCamera.orthoHeight,
    };
  }

  function applyCameraPose(): void {
    camera.setPosition(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  }

  function publishCameraState(): void {
    options.onCameraChanged?.(readCameraState());
  }

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const nextHeight = clamp(
      tacticalCamera.orthoHeight * Math.exp(event.deltaY * CAMERA_ZOOM_RATE),
      CAMERA_MIN_ORTHO_HEIGHT,
      CAMERA_MAX_ORTHO_HEIGHT,
    );

    if (nextHeight === tacticalCamera.orthoHeight) return;

    tacticalCamera.orthoHeight = nextHeight;
    publishCameraState();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 2) return;

    event.preventDefault();
    dragPointerId = event.pointerId;
    lastDragPosition = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (dragPointerId !== event.pointerId || !lastDragPosition) return;

    const deltaX = event.clientX - lastDragPosition.x;
    const deltaY = event.clientY - lastDragPosition.y;
    lastDragPosition = { x: event.clientX, y: event.clientY };
    panCamera(deltaX, deltaY);
  };

  const onPointerEnd = (event: PointerEvent): void => {
    if (dragPointerId !== event.pointerId) return;

    dragPointerId = undefined;
    lastDragPosition = undefined;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  function panCamera(deltaX: number, deltaY: number): void {
    const forwardX = cameraTarget.x - cameraPosition.x;
    const forwardZ = cameraTarget.z - cameraPosition.z;
    const forwardLength = Math.hypot(forwardX, forwardZ);

    if (forwardLength <= 0) return;

    const normalizedForwardX = forwardX / forwardLength;
    const normalizedForwardZ = forwardZ / forwardLength;
    const rightX = -normalizedForwardZ;
    const rightZ = normalizedForwardX;
    const unitsPerPixel = (tacticalCamera.orthoHeight * 2) / Math.max(canvas.clientHeight, 1);
    const requestedX = (-deltaX * rightX + deltaY * normalizedForwardX) * unitsPerPixel;
    const requestedZ = (-deltaX * rightZ + deltaY * normalizedForwardZ) * unitsPerPixel;
    const world = options.readState().world;
    const nextTargetX = clamp(cameraTarget.x + requestedX, 0, world.width - 1);
    const nextTargetZ = clamp(cameraTarget.z + requestedZ, 0, world.height - 1);
    const appliedX = nextTargetX - cameraTarget.x;
    const appliedZ = nextTargetZ - cameraTarget.z;

    if (appliedX === 0 && appliedZ === 0) return;

    cameraTarget.x = nextTargetX;
    cameraTarget.z = nextTargetZ;
    cameraPosition.x += appliedX;
    cameraPosition.z += appliedZ;
    applyCameraPose();
    publishCameraState();
  }

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerEnd);
  canvas.addEventListener("pointercancel", onPointerEnd);
  canvas.addEventListener("lostpointercapture", onPointerEnd);
  canvas.addEventListener("contextmenu", onContextMenu);

  rebuildPresentation();
  app.start();
  publishCameraState();
  options.onReady?.(canvas);

  return {
    app,
    canvas,
    rebuildPresentation,
    resolvePointerInteraction(
      position: ScreenPosition,
      state = options.readState(),
    ): PlayCanvasPointerInteraction {
      return resolvePlayCanvasPointerInteraction(position, canvas, tacticalCamera, state);
    },
    readCameraState,
    destroy(): void {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("lostpointercapture", onPointerEnd);
      canvas.removeEventListener("contextmenu", onContextMenu);
      presentationRoot?.destroy();
      app.destroy();
      canvas.remove();
    },
  };
}

function interpolate(previous: number, current: number, alpha: number): number {
  return previous + (current - previous) * alpha;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
