const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  servers: {
    list: () => ipcRenderer.invoke("servers:list"),
    add: (server) => ipcRenderer.invoke("servers:add", server),
    update: (id, patch) => ipcRenderer.invoke("servers:update", id, patch),
    remove: (id) => ipcRenderer.invoke("servers:remove", id),
    scanFolder: (folderPath) => ipcRenderer.invoke("servers:scanFolder", folderPath)
  },
  dialog: {
    chooseFolder: () => ipcRenderer.invoke("dialog:chooseFolder")
  },
  fs: {
    list: (dirPath) => ipcRenderer.invoke("fs:list", dirPath),
    readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke("fs:writeFile", filePath, content),
    openInExplorer: (targetPath) => ipcRenderer.invoke("fs:openInExplorer", targetPath)
  },
  paper: {
    versions: () => ipcRenderer.invoke("paper:versions"),
    builds: (version) => ipcRenderer.invoke("paper:builds", version),
    setupServer: (payload) => ipcRenderer.invoke("paper:setupServer", payload)
  },
  hangar: {
    search: (payload) => ipcRenderer.invoke("hangar:search", payload),
    installPlugin: (payload) => ipcRenderer.invoke("hangar:installPlugin", payload),
    checkUpdates: (payload) => ipcRenderer.invoke("hangar:checkUpdates", payload)
  },
  process: {
    start: (payload) => ipcRenderer.invoke("process:start", payload),
    stop: (payload) => ipcRenderer.invoke("process:stop", payload),
    command: (payload) => ipcRenderer.invoke("process:command", payload),
    status: (payload) => ipcRenderer.invoke("process:status", payload),
    // onLog/onExit bir "unsubscribe" fonksiyonu döndürür. React tarafında
    // useEffect cleanup'ında bu fonksiyon çağrılmazsa (StrictMode'da olduğu
    // gibi effect'ler tekrar tetiklendiğinde) dinleyici birikir ve konsolda
    // aynı satır birden fazla kez görünür — bu yüzden çağıran taraf mutlaka
    // dönen fonksiyonu cleanup'ta çalıştırmalı.
    onLog: (cb) => {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on("process:log", listener);
      return () => ipcRenderer.removeListener("process:log", listener);
    },
    onExit: (cb) => {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on("process:exit", listener);
      return () => ipcRenderer.removeListener("process:exit", listener);
    }
  },
  backup: {
    create: (payload) => ipcRenderer.invoke("backup:create", payload),
    list: (payload) => ipcRenderer.invoke("backup:list", payload)
  }
});
