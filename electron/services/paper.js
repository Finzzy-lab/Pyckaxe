const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");
const { net } = require("electron");

/**
 * PaperMC'nin eski v2 API'si (api.papermc.io/v2) kaldırıldı ve artık HTTP 410
 * dönüyor. Güncel API "Fill" adıyla fill.papermc.io üzerinde yayınlanıyor.
 * Docs: https://docs.papermc.io/misc/downloads-service/
 */
const BASE = "https://fill.papermc.io/v3/projects/paper";
const DOWNLOAD_KEY = "server:default";

// Ana süreçteki global fetch() Chromium'un Fetch spec'ini takip eder ve bu
// spec "User-Agent" başlığının elle set edilmesini yasaklar (forbidden
// header) — sessizce yok sayılır. net.fetch() bu kısıtlamayı bypass eder ve
// PaperMC'nin zorunlu tuttuğu User-Agent'ı gerçekten gönderir.
async function fetchJson(url, userAgent) {
  const res = await net.fetch(url, { headers: { "User-Agent": userAgent } });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.ok === false) {
    const msg = body?.message || `HTTP ${res.status}`;
    throw new Error(`PaperMC API hatası: ${msg}`);
  }
  return body;
}

// Yanıt "versions" alanında minör seri bazında gruplanmış gelir, örn.
// { "1.21": ["1.21.4", "1.21.3", ...], "1.20": [...] }. Gruplar da grup
// içindeki sürümler de en yeniden en eskiye sıralı geliyor; düz bir listeye
// çeviriyoruz.
async function listVersions(userAgent) {
  const data = await fetchJson(BASE, userAgent);
  return Object.values(data.versions || {}).flat();
}

async function listBuilds(version, userAgent) {
  const data = await fetchJson(`${BASE}/versions/${version}/builds`, userAgent);
  const builds = Array.isArray(data) ? data : [];

  return builds
    .filter((b) => b.channel === "STABLE")
    .sort((a, b) => b.id - a.id)
    .map((b) => {
      const dl = b.downloads?.[DOWNLOAD_KEY];
      return {
        build: b.id,
        time: b.time,
        jarName: dl?.name,
        sha256: dl?.checksums?.sha256,
        url: dl?.url
      };
    })
    .filter((b) => b.url); // indirme linki olmayan (eksik) build'leri ele
}

async function downloadServerJar({ folderPath, jarName, sha256, url, userAgent }) {
  await fs.mkdir(folderPath, { recursive: true });

  const res = await net.fetch(url, { headers: { "User-Agent": userAgent } });
  if (!res.ok) throw new Error(`Jar indirilemedi (${res.status})`);

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (sha256) {
    const actualSha = crypto.createHash("sha256").update(buffer).digest("hex");
    if (actualSha !== sha256) {
      throw new Error("İndirilen dosyanın SHA256 doğrulaması başarısız oldu. Tekrar deneyin.");
    }
  }

  const jarPath = path.join(folderPath, "server.jar");
  await fs.writeFile(jarPath, buffer);
  return jarPath;
}

async function writeEula(folderPath) {
  const eulaPath = path.join(folderPath, "eula.txt");
  const content = [
    "# Pyckaxe tarafından oluşturuldu.",
    "# Devam ederek Mojang EULA'sını kabul etmiş olursun: https://aka.ms/MinecraftEULA",
    "eula=true",
    ""
  ].join("\n");
  await fs.writeFile(eulaPath, content, "utf-8");

  const pluginsDir = path.join(folderPath, "plugins");
  if (!fsSync.existsSync(pluginsDir)) await fs.mkdir(pluginsDir);
}

async function writeStartScripts(folderPath, ramGb) {
  const ram = `${ramGb}G`;
  const jvmFlags = `-Xms${ram} -Xmx${ram}`;

  const shScript = `#!/usr/bin/env bash\ncd "$(dirname "$0")"\njava ${jvmFlags} -jar server.jar --nogui\n`;
  const shPath = path.join(folderPath, "start.sh");
  await fs.writeFile(shPath, shScript, { mode: 0o755 });

  const batScript = `@echo off\r\ncd /d "%~dp0"\r\njava ${jvmFlags} -jar server.jar --nogui\r\npause\r\n`;
  const batPath = path.join(folderPath, "start.bat");
  await fs.writeFile(batPath, batScript);
}

module.exports = { listVersions, listBuilds, downloadServerJar, writeEula, writeStartScripts };
