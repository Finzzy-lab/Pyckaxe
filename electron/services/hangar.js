const fs = require("fs/promises");
const path = require("path");
const { net } = require("electron");

/**
 * NOT: Aşağıdaki uç noktalar Hangar'ın genel API v1 yapısına (OpenAPI/Swagger
 * dokümanı hangar.papermc.io üzerinde yayınlanır) dayanıyor. Kodlamaya
 * başlamadan önce güncel Swagger dokümanından teyit edin; Hangar hâlâ "Open
 * Beta" aşamasında olduğu için alan adları/uçlar zamanla değişebilir.
 */
const BASE = "https://hangar.papermc.io/api/v1";

// Global fetch() yerine net.fetch() kullanıyoruz; nedeni paper.js'teki
// açıklamayla aynı — Chromium'un Fetch spec'i User-Agent'ı forbidden header
// sayıyor, net.fetch bu kısıtlamayı bypass ediyor.
async function fetchJson(url, userAgent, options = {}) {
  const res = await net.fetch(url, {
    ...options,
    headers: { "User-Agent": userAgent, ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`Hangar API hatası (${res.status}): ${url}`);
  return res.json();
}

async function searchProjects({ query, mcVersion, category, userAgent }) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  params.set("platform", "PAPER");
  if (mcVersion) params.set("version", mcVersion);
  params.set("limit", "25");
  params.set("sort", "-downloads");

  const data = await fetchJson(`${BASE}/projects?${params.toString()}`, userAgent);
  const results = data.result || data.projects || [];

  return results.map((p) => ({
    slug: p.namespace ? `${p.namespace.owner}/${p.namespace.slug}` : p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    downloads: p.stats?.downloads ?? 0,
    stars: p.stats?.stars ?? 0,
    iconUrl: p.avatarUrl
  }));
}

async function listVersions(slug, userAgent) {
  const data = await fetchJson(`${BASE}/projects/${slug}/versions?limit=25`, userAgent);
  return data.result || data.versions || [];
}

function findCompatibleVersion(versions, mcVersion) {
  return versions.find((v) => {
    const supported = v.platformDependencies?.PAPER || v.platformDependenciesFormatted?.Paper || [];
    return Array.isArray(supported) ? supported.includes(mcVersion) : String(supported).includes(mcVersion);
  });
}

async function installPlugin({ folderPath, slug, mcVersion, userAgent }) {
  const versions = await listVersions(slug, userAgent);
  const match = findCompatibleVersion(versions, mcVersion);
  if (!match) {
    throw new Error(`Bu plugin için ${mcVersion} sürümüyle uyumlu bir sürüm bulunamadı.`);
  }

  const downloadUrl = `${BASE}/projects/${slug}/versions/${match.name}/PAPER/download`;
  const res = await net.fetch(downloadUrl, { headers: { "User-Agent": userAgent } });
  if (!res.ok) throw new Error(`Plugin indirilemedi (${res.status})`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const pluginsDir = path.join(folderPath, "plugins");
  await fs.mkdir(pluginsDir, { recursive: true });

  const fileName = `${slug.split("/").pop()}-${match.name}.jar`;
  const filePath = path.join(pluginsDir, fileName);
  await fs.writeFile(filePath, buffer);

  return { slug, installedVersion: match.name, fileName };
}

async function checkUpdates({ plugins, mcVersion, userAgent }) {
  const results = [];
  for (const plugin of plugins) {
    try {
      const versions = await listVersions(plugin.slug, userAgent);
      const latestCompatible = findCompatibleVersion(versions, mcVersion);
      results.push({
        slug: plugin.slug,
        currentVersion: plugin.installedVersion,
        latestVersion: latestCompatible?.name ?? null,
        updateAvailable: !!latestCompatible && latestCompatible.name !== plugin.installedVersion
      });
    } catch (err) {
      results.push({ slug: plugin.slug, error: err.message });
    }
  }
  return results;
}

module.exports = { searchProjects, listVersions, installPlugin, checkUpdates };
