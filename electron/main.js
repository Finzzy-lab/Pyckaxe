const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const { spawn } = require("child_process");
const Store = require("./store");
const paper = require("./services/paper");
const hangar = require("./services/hangar");
const backup = require("./services/backup");

const isDev = process.env.NODE_ENV === "development";

// Hangar ve PaperMC API'leri isteklerinde net bir User-Agent zorunlu tutuyor.
// Buradaki iletişim bilgisini kendi projenize göre güncelleyin.
const USER_AGENT = "Pyckaxe/0.1.0 (+https://github.com/your-org/pyckaxe)";

const store = new Store();
const runningServers = new Map(); // serverId -> ChildProcess

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#16181C",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // DevTools artık otomatik açılmıyor — her `npm run dev` çalıştırmasında
    // ayrı bir pencere belirmesin diye. Gerektiğinde Ctrl/Cmd+Shift+I ile
    // aç, ya da PYCKAXE_DEVTOOLS=1 ile otomatik açılmasını iste.
    if (process.env.PYCKAXE_DEVTOOLS === "1") {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Kapanmadan önce açık sunucuları nazikçe durdur
  for (const [, child] of runningServers) {
    try {
      child.stdin.write("stop\n");
    } catch (_) {}
  }
  if (process.platform !== "darwin") app.quit();
});

// ---------- Sunucu kayıtları (yerel JSON) ----------

ipcMain.handle("servers:list", () => store.getServers());

ipcMain.handle("servers:add", (_e, server) => store.addServer(server));

ipcMain.handle("servers:update", (_e, id, patch) => store.updateServer(id, patch));

ipcMain.handle("servers:remove", (_e, id) => {
  const child = runningServers.get(id);
  if (child) child.kill();
  runningServers.delete(id);
  return store.removeServer(id);
});

// ---------- Klasör / dosya işlemleri ----------

ipcMain.handle("dialog:chooseFolder", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"]
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// Var olan bir sunucu klasörünü içe aktarırken: server.jar var mı, RAM
// başlatma script'inden tahmin edilebiliyor mu, plugins/ klasöründe hangi
// .jar'lar var — hepsini tek seferde tarayıp döndürür.
ipcMain.handle("servers:scanFolder", async (_e, folderPath) => {
  const exists = (p) => fsSync.existsSync(path.join(folderPath, p));

  let ramGb = null;
  for (const scriptName of ["start.sh", "start.bat"]) {
    const scriptPath = path.join(folderPath, scriptName);
    if (fsSync.existsSync(scriptPath)) {
      const content = await fs.readFile(scriptPath, "utf-8");
      const match = content.match(/-Xmx(\d+)\s*G/i);
      if (match) ramGb = Number(match[1]);
      break;
    }
  }

  let pluginJars = [];
  const pluginsDir = path.join(folderPath, "plugins");
  if (fsSync.existsSync(pluginsDir)) {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    pluginJars = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".jar"))
      .map((e) => e.name);
  }

  return {
    hasServerJar: exists("server.jar"),
    hasEula: exists("eula.txt"),
    ramGb,
    pluginJars
  };
});

// Güvenli yol doğrulama (Path Traversal koruması)
function ensureSafePath(targetPath) {
  if (!targetPath || typeof targetPath !== "string") {
    throw new Error("Geçersiz dosya yolu.");
  }
  const resolved = path.resolve(targetPath);
  const servers = store.getServers();
  const allowedRoots = [
    app.getPath("userData"),
    app.getPath("temp"),
    ...servers.map((s) => s.folderPath).filter(Boolean)
  ];

  const isAllowed = allowedRoots.some((root) => {
    const rel = path.relative(path.resolve(root), resolved);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });

  if (!isAllowed) {
    throw new Error("Yetkisiz dosya erişim girişimi engellendi.");
  }
  return resolved;
}

ipcMain.handle("fs:list", async (_e, dirPath) => {
  const safePath = ensureSafePath(dirPath);
  const entries = await fs.readdir(safePath, { withFileTypes: true });
  return entries
    .map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(safePath, e.name)
    }))
    .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name));
});

ipcMain.handle("fs:readFile", async (_e, filePath) => {
  const safePath = ensureSafePath(filePath);
  const stat = await fs.stat(safePath);
  if (stat.size > 2 * 1024 * 1024) {
    throw new Error("Dosya 2MB üzerinde, düzenleyicide açılamıyor.");
  }
  return fs.readFile(safePath, "utf-8");
});

ipcMain.handle("fs:writeFile", (_e, filePath, content) => {
  const safePath = ensureSafePath(filePath);
  return fs.writeFile(safePath, content, "utf-8");
});

ipcMain.handle("fs:openInExplorer", (_e, targetPath) => {
  const safePath = ensureSafePath(targetPath);
  return shell.showItemInFolder(safePath);
});

// ---------- PaperMC ----------

ipcMain.handle("paper:versions", () => paper.listVersions(USER_AGENT));

ipcMain.handle("paper:builds", (_e, version) => paper.listBuilds(version, USER_AGENT));

ipcMain.handle("paper:setupServer", async (_e, { folderPath, jarName, sha256, url, ramGb }) => {
  await paper.downloadServerJar({ folderPath, jarName, sha256, url, userAgent: USER_AGENT });
  await paper.writeEula(folderPath);
  await paper.writeStartScripts(folderPath, ramGb);
  return true;
});

// ---------- Hangar ----------

ipcMain.handle("hangar:search", (_e, { query, mcVersion, category }) =>
  hangar.searchProjects({ query, mcVersion, category, userAgent: USER_AGENT })
);

ipcMain.handle("hangar:installPlugin", (_e, { folderPath, slug, mcVersion }) =>
  hangar.installPlugin({ folderPath, slug, mcVersion, userAgent: USER_AGENT })
);

ipcMain.handle("hangar:checkUpdates", (_e, { plugins, mcVersion }) =>
  hangar.checkUpdates({ plugins, mcVersion, userAgent: USER_AGENT })
);

// ---------- Sunucu süreci (başlat/durdur/konsol) ----------

ipcMain.handle("process:start", (event, { id, folderPath, ramGb }) => {
  if (runningServers.has(id)) return { alreadyRunning: true };

  const scriptName = process.platform === "win32" ? "start.bat" : "start.sh";
  const scriptPath = path.join(folderPath, scriptName);
  if (!fsSync.existsSync(scriptPath)) {
    throw new Error("Başlatma script'i bulunamadı, sunucu kurulumu tamamlanmamış olabilir.");
  }

  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/c", scriptPath], { cwd: folderPath })
      : spawn("bash", [scriptPath], { cwd: folderPath });

  runningServers.set(id, child);

  const send = (channel, data) => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, { id, data });
  };

  child.stdout.on("data", (buf) => send("process:log", buf.toString()));
  child.stderr.on("data", (buf) => send("process:log", buf.toString()));
  child.on("exit", (code) => {
    runningServers.delete(id);
    send("process:exit", code);
  });

  return { started: true };
});

ipcMain.handle("process:command", (_e, { id, command }) => {
  const child = runningServers.get(id);
  if (!child) return false;
  child.stdin.write(command + "\n");
  return true;
});

ipcMain.handle("process:stop", (_e, { id }) => {
  const child = runningServers.get(id);
  if (!child) return false;
  child.stdin.write("stop\n");
  return true;
});

ipcMain.handle("process:status", (_e, { id }) => runningServers.has(id));

// ---------- Yedekleme ----------

ipcMain.handle("backup:create", async (_e, { folderPath }) => {
  return backup.createBackup(folderPath);
});

ipcMain.handle("backup:list", (_e, { folderPath }) => backup.listBackups(folderPath));
