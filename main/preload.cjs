const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  logout: () => ipcRenderer.invoke('logout'),
  navigate: (path) => ipcRenderer.invoke('navigate', { path }),
  // NEW: Add button click handler that doesn't trigger navigation
  handleButtonClick: (action, data) => ipcRenderer.invoke('button-click', { action, data })
});