import Phaser from "phaser";
import type { ToyDomainState } from "../domain/index.js";

const CELL_SIZE = 40;
const PROBE_SIZE = 28;
const MARKER_RADIUS = 8;

export interface PhaserProbeOptions {
  readonly parent: HTMLElement;
  readonly readState: () => ToyDomainState;
  readonly onReady?: (canvas: HTMLCanvasElement) => void;
}

export function createPhaserProbe(options: PhaserProbeOptions): Phaser.Game {
  const initialState = options.readState();

  class ProbeScene extends Phaser.Scene {
    private readonly renderedObjects: Phaser.GameObjects.GameObject[] = [];

    public create(): void {
      this.renderAuthoritativeState(options.readState());
      options.onReady?.(this.game.canvas);
    }

    private renderAuthoritativeState(state: ToyDomainState): void {
      for (const gameObject of this.renderedObjects) {
        gameObject.destroy();
      }
      this.renderedObjects.length = 0;

      const probe = this.add.rectangle(
        toScreenCoordinate(state.probe.position.x),
        toScreenCoordinate(state.probe.position.y),
        PROBE_SIZE,
        PROBE_SIZE,
        0x60a5fa,
      );
      probe.setData("domainEntityId", state.probe.id);

      const marker = this.add.circle(
        toScreenCoordinate(state.marker.position.x),
        toScreenCoordinate(state.marker.position.y),
        MARKER_RADIUS,
        0xfbbf24,
      );
      marker.setData("presentationRole", "marker");

      this.renderedObjects.push(probe, marker);
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
