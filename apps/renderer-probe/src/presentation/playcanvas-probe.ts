import {
  Application,
  Color,
  Entity,
  FILLMODE_NONE,
  PROJECTION_ORTHOGRAPHIC,
  RESOLUTION_FIXED,
} from "playcanvas";
import { getToyElevation, type ToyDomainState } from "../domain/index.js";

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const CELL_SIZE = 1;

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

export interface PlayCanvasProbeOptions {
  readonly parent: HTMLElement;
  readonly readState: () => ToyDomainState;
  readonly onReady?: (canvas: HTMLCanvasElement) => void;
}

export interface PlayCanvasProbe {
  readonly app: Application;
  rebuildPresentation(state?: ToyDomainState): void;
  destroy(): void;
}

export function projectToyStateToPlayCanvas(
  state: ToyDomainState,
  alpha = 1,
): readonly PlayCanvasPresentationView[] {
  const interpolationAlpha = clamp(alpha, 0, 1);
  const probePosition = {
    x: interpolate(
      state.probe.previousPosition.x,
      state.probe.position.x,
      interpolationAlpha,
    ),
    y: interpolate(
      state.probe.previousPosition.y,
      state.probe.position.y,
      interpolationAlpha,
    ),
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

  const camera = new Entity("TacticalCamera");
  camera.addComponent("camera", {
    clearColor: new Color(0.08, 0.11, 0.16),
    projection: PROJECTION_ORTHOGRAPHIC,
    orthoHeight: 6,
  });
  camera.setPosition(8.5, 9, 8.5);
  camera.lookAt(3.5, 0, 3.5);
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

  rebuildPresentation();
  app.start();
  options.onReady?.(canvas);

  return {
    app,
    rebuildPresentation,
    destroy(): void {
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
