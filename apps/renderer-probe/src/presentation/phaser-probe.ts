import Phaser from "phaser";
import type { ToyDomainState } from "../domain/index.js";
import type { ProbeSimulationFrame } from "../simulation/probe-simulation.js";

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
    private probeObject: Phaser.GameObjects.Rectangle | undefined;
    private markerObject: Phaser.GameObjects.Arc | undefined;

    public create(): void {
      this.createPresentation(options.readState());
      options.onReady?.(this.game.canvas);
    }

    public update(_time: number, frameDeltaMs: number): void {
      const frame = options.advanceFrame(frameDeltaMs);
      this.renderFrame(frame.state, frame.alpha);
    }

    private createPresentation(state: ToyDomainState): void {
      this.probeObject = this.add.rectangle(
        toScreenCoordinate(state.probe.position.x),
        toScreenCoordinate(state.probe.position.y),
        PROBE_SIZE,
        PROBE_SIZE,
        0x60a5fa,
      );
      this.probeObject.setData("domainEntityId", state.probe.id);

      this.markerObject = this.add.circle(
        toScreenCoordinate(state.marker.position.x),
        toScreenCoordinate(state.marker.position.y),
        MARKER_RADIUS,
        0xfbbf24,
      );
      this.markerObject.setData("presentationRole", "marker");
    }

    private renderFrame(state: ToyDomainState, alpha: number): void {
      if (!this.probeObject || !this.markerObject) return;

      this.probeObject.setPosition(
        toScreenCoordinate(
          interpolate(state.probe.previousPosition.x, state.probe.position.x, alpha),
        ),
        toScreenCoordinate(
          interpolate(state.probe.previousPosition.y, state.probe.position.y, alpha),
        ),
      );
      this.markerObject.setPosition(
        toScreenCoordinate(state.marker.position.x),
        toScreenCoordinate(state.marker.position.y),
      );
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

function interpolate(previous: number, current: number, alpha: number): number {
  return previous + (current - previous) * alpha;
}

function toScreenCoordinate(domainCoordinate: number): number {
  return domainCoordinate * CELL_SIZE + CELL_SIZE / 2;
}
