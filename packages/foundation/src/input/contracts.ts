export type InputSequence = number;

export type PhysicalKeyCode = string;
export type PointerId = number;
export type PointerButton = number;
export type PointerType = "mouse" | "pen" | "touch" | "unknown";
export type DigitalInputPhase = "pressed" | "released";
export type WheelUnit = "pixel" | "line" | "page";
export type PhysicalInputResetReason = "blur" | "hidden" | "detach";
export type PhysicalInputResetScope = "keyboard" | "pointer" | "all";

export interface ScreenPosition {
  readonly x: number;
  readonly y: number;
}

export interface PhysicalKeyInput {
  readonly kind: "key";
  readonly sequence: InputSequence;
  readonly code: PhysicalKeyCode;
  readonly phase: DigitalInputPhase;
}

export interface PhysicalPointerPositionInput {
  readonly kind: "pointer-position";
  readonly sequence: InputSequence;
  readonly pointerId: PointerId;
  readonly pointerType: PointerType;
  readonly position: ScreenPosition;
}

export interface PhysicalPointerButtonInput {
  readonly kind: "pointer-button";
  readonly sequence: InputSequence;
  readonly pointerId: PointerId;
  readonly pointerType: PointerType;
  readonly button: PointerButton;
  readonly phase: DigitalInputPhase;
  readonly position: ScreenPosition;
}

export interface PhysicalPointerCancelInput {
  readonly kind: "pointer-cancel";
  readonly sequence: InputSequence;
  readonly pointerId: PointerId;
}

export interface PhysicalWheelInput {
  readonly kind: "wheel";
  readonly sequence: InputSequence;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaZ: number;
  readonly unit: WheelUnit;
}

export interface PhysicalInputReset {
  readonly kind: "reset";
  readonly sequence: InputSequence;
  readonly scope: PhysicalInputResetScope;
  readonly reason: PhysicalInputResetReason;
}

export type PhysicalInputEvent =
  | PhysicalKeyInput
  | PhysicalPointerPositionInput
  | PhysicalPointerButtonInput
  | PhysicalPointerCancelInput
  | PhysicalWheelInput
  | PhysicalInputReset;

export type PhysicalInputSink = (event: PhysicalInputEvent) => void;

export type LogicalActionId = string;

export interface LogicalActionState {
  readonly action: LogicalActionId;
  readonly held: boolean;
  readonly pressed: boolean;
  readonly released: boolean;
}

export interface InputCommand<TCommandId extends string = string, TPayload = undefined> {
  readonly id: TCommandId;
  readonly sequence: InputSequence;
  readonly payload: TPayload;
}

export interface InputSequenceSource {
  next(): InputSequence;
}
