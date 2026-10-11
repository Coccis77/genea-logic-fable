import '@testing-library/jest-dom/vitest';

// React Flow needs these browser APIs, which jsdom does not provide.
class ResizeObserverMock {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback([{ target, contentRect: { width: 1, height: 1 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyMock {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
    this.m22 = scale !== undefined ? Number(scale) : 1;
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', { writable: true, value: ResizeObserverMock });
Object.defineProperty(globalThis, 'DOMMatrixReadOnly', { writable: true, value: DOMMatrixReadOnlyMock });

Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { get() { return parseFloat((this as HTMLElement).style.height) || 1; } },
  offsetWidth: { get() { return parseFloat((this as HTMLElement).style.width) || 1; } },
});

(SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
  ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;

// user-event dispatches mouse events with view === null (via a non-configurable property);
// d3-zoom/d3-drag, used by React Flow, dereference event.view. Make `view` configurable so the
// capture listener below can point it at the window.
const NativeMouseEvent = window.MouseEvent;
class ConfigurableViewMouseEvent extends NativeMouseEvent {
  constructor(type: string, init?: MouseEventInit) {
    super(type, init);
    Object.defineProperty(this, 'view', { configurable: true, get: () => init?.view ?? null });
  }
}
Object.defineProperty(window, 'MouseEvent', { writable: true, configurable: true, value: ConfigurableViewMouseEvent });
for (const type of ['mousedown', 'mouseup', 'mousemove']) {
  window.addEventListener(type, (event) => {
    if ((event as MouseEvent).view === null) Object.defineProperty(event, 'view', { configurable: true, value: window });
  }, true);
}

beforeEach(() => {
  localStorage.clear();
});
