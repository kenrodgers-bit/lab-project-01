const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  getStatus: () => ipcRenderer.invoke('desktop:get-status'),
  openLocal: () => ipcRenderer.invoke('desktop:open-local'),
  openLan: () => ipcRenderer.invoke('desktop:open-lan'),
  setAutostart: (enabled) => ipcRenderer.invoke('desktop:set-autostart', enabled),
  quit: () => ipcRenderer.invoke('desktop:quit'),
  getConfig: () => ipcRenderer.invoke('desktop:config:get'),
  saveConfig: (payload) => ipcRenderer.invoke('desktop:config:save', payload),
  cancelConfig: () => ipcRenderer.invoke('desktop:config:cancel'),
});
