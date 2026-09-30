import Phaser from "phaser";
import type { ToyDomainState } from "../domain/index.js";
import type { ProbeSimulationFrame } from "../simulation/probe-simulation.js";
import { projectToyPresentation, type ToyPresentationView } from "./toy-presentation.js";

const CELL_SIZE = 40;
const PROBE_SIZE = 28;
const MARKER_RADIUS = 8;

export interface PhaserProbeOptions {
  readonly parent: HTMLElement;
  readonly readState: () => ToyDomainState;
  readonly advanceFrame: (frameDeltaMs: number) => ProbeSimulationFrame;
  readonly onReady?: (canvas: HTMLCanvasElement) => void;
}

export function createPhaserProbe(options: PhaserProbeOptions): Phaser.Game {
  const initialState = options.readState();

  class ProbeScene extends Phaser.Scene {
    private readonly viewObjects = new Map<string, Phaser.GameObjects.Shape>();

    public create(): void {
      this.syncPresentation(options.readState(), 1);
      options.onReady?.(this.game.canvas);
    }

    public override update(_time: number, frameDeltaMs: number): void {
      const frame = options.advanceFrame(frameDeltaMs);
      this.syncPresentation(frame.state, frame.alpha);
    }

    private syncPresentation(state: ToyDomainState, alpha: number): void {
      const views = projectToyPresentation(state, alpha);
      const activeViewIds = new Set(views.map((view) => view.viewId));

      for (const [viewId, gameObject] of this.viewObjects) {
        if (!activeViewIds.has(viewId)) {
          gameObject.destroy();
          this.viewObjects.delete(viewId);
        }
      }

      for (const view of views) {
        let gameObject = this.viewObjects.get(view.viewId);

        if (!gameObject) {
          gameObject = this.createViewObject(view);
          this.viewObjects.set(view.viewId, gameObject);
        }

        gameObject.setPosition(
          toScreenCoordinate(view.position.x),
          toScreenCoordinate(view.position.y),
        );
      }
    }

    private createViewObject(view: ToyPresentationView): Phaser.GameObjects.Shape {
      switch (view.kind) {
        case "probe": {
          const gameObject = this.add.rectangle(0, 0, PROBE_SIZE, PROBE_SIZE, 0x60a5fa);
          gameObject.setData("domainEntityId", view.domainEntityId);
          gameObject.setData("presentationViewId", view.viewId);
          return gameObject;
        }
        case "marker": {
          const gameObject = this.add.circle(0, 0, MARKER_RADIUS, 0xfbbf24);
          gameObject.setData("presentationRole", "marker");
          gameObject.setData("presentationViewId", view.viewId);
          return gameObject;
        }
      }
    }
  }

  return new Phaser.Game({
    type: Phaser.CANVAS,
    width: initialState.world.width * CELL_SIZE,
    height: initialState.world.height * CELL_SIZE,
    parent: options.parent,
    backgroundColor: "#1f2937",
    scene: ProbeScene,
    banner: false,
  });
}

function toScreenCoordinate(domainCoordinate: number): number {
  return domainCoordinate * CELL_SIZE + CELL_SIZE / 2;
}
