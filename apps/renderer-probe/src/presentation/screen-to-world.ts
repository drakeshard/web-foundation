import type { ScreenPosition } from "@drakeshard/foundation/input";
import type { ToyPoint, ToyWorld } from "../domain/index.js";

export function clientPositionToToyPoint(
  position: ScreenPosition,
  canvas: HTMLCanvasElement,
  world: ToyWorld,
): ToyPoint {
  const bounds = canvas.getBoundingClientRect();
  const canvasX = ((position.x - bounds.left) / bounds.width) * canvas.width;
  const canvasY = ((position.y - bounds.top) / bounds.height) * canvas.height;

  return {
    x: clampCell(Math.floor((canvasX / canvas.width) * world.width), world.width),
    y: clampCell(Math.floor((canvasY / canvas.height) * world.height), world.height),
  };
}

function clampCell(value: number, size: number): number {
  return Math.min(size - 1, Math.max(0, value));
}
