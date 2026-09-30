export interface BrowserInputEventTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface BrowserVisibilityTarget extends BrowserInputEventTarget {
  readonly visibilityState: string;
}
