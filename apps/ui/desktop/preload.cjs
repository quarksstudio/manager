const { contextBridge, ipcRenderer } = require('electron');
// Sandboxed preloads cannot require local modules: keep this channel explicit.
contextBridge.exposeInMainWorld('quarkDesktop', {
  notifications: {
    show: (message) => ipcRenderer.invoke('quark:notifications:show', message),
  },
});
