/** Explicit browser boundary: filesystem storage is only available in Node. */
export class NodeStorageAdapter {
  constructor() {
    throw new Error('Node storage is unavailable in the browser');
  }
}
