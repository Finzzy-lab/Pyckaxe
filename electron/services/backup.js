const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const WORLD_FOLDERS = ["world", "world_nether", "world_the_end"];
const EXTRA_FILES = ["server.properties", "ops.json", "whitelist.json", "banned-players.json", "banned-ips.json"];

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function createBackup(folderPath) {
  const backupsDir = path.join(folderPath, "backups");
  await fs.mkdir(backupsDir, { recursive: true });

  const zip = new AdmZip();
  let addedAnything = false;

  for (const world of WORLD_FOLDERS) {
    const worldPath = path.join(folderPath, world);
    if (fsSync.existsSync(worldPath)) {
      zip.addLocalFolder(worldPath, world);
      addedAnything = true;
    }
  }

  for (const file of EXTRA_FILES) {
    const filePath = path.join(folderPath, file);
    if (fsSync.existsSync(filePath)) {
      zip.addLocalFile(filePath);
      addedAnything = true;
    }
  }

  if (!addedAnything) {
    throw new Error("Yedeklenecek bir world klasörü bulunamadı. Sunucuyu en az bir kere başlatman gerekebilir.");
  }

  const fileName = `backup-${timestamp()}.zip`;
  const outPath = path.join(backupsDir, fileName);
  zip.writeZip(outPath);

  const stat = await fs.stat(outPath);
  return { fileName, path: outPath, sizeBytes: stat.size, createdAt: new Date().toISOString() };
}

async function listBackups(folderPath) {
  const backupsDir = path.join(folderPath, "backups");
  if (!fsSync.existsSync(backupsDir)) return [];

  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const zips = entries.filter((e) => e.isFile() && e.name.endsWith(".zip"));

  const withStats = await Promise.all(
    zips.map(async (e) => {
      const full = path.join(backupsDir, e.name);
      const stat = await fs.stat(full);
      return { fileName: e.name, path: full, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
  );

  return withStats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = { createBackup, listBackups };
