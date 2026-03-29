const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  search: (query) => ipcRenderer.invoke("search", query),
  getWord: (word) => ipcRenderer.invoke("getWord", word),
});
