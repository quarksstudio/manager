/* eslint-disable @typescript-eslint/no-empty-function */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
}

if (typeof globalThis.MessageChannel === 'undefined') {
  class MessagePortStub {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    private peer?: MessagePortStub;
    start() {}
    close() {}
    postMessage(data: unknown) {
      setTimeout(() => {
        if (this.peer && this.peer.onmessage) {
          this.peer.onmessage({ data });
        }
      }, 0);
    }
  }
  class MessageChannelStub {
    port1 = new MessagePortStub();
    port2 = new MessagePortStub();
    constructor() {
      this.port1.peer = this.port2;
      this.port2.peer = this.port1;
    }
  }
  (globalThis as Record<string, unknown>).MessageChannel = MessageChannelStub;
  (globalThis as Record<string, unknown>).MessagePort = MessagePortStub;
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });
}

if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
