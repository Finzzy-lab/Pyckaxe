import React, { useState } from "react";

export default function PluginsTab({ server, onChanged }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [installingSlug, setInstallingSlug] = useState(null);
  const [error, setError] = useState("");
  const [updateInfo, setUpdateInfo] = useState({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    setSearching(true);
    setError("");
    try {
      const list = await window.api.hangar.search({ query, mcVersion: server.mcVersion });
      setResults(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const install = async (plugin) => {
    setInstallingSlug(plugin.slug);
    setError("");
    try {
      const installed = await window.api.hangar.installPlugin({
        folderPath: server.path,
        slug: plugin.slug,
        mcVersion: server.mcVersion
      });
      const updatedPlugins = [...(server.plugins || []).filter((p) => p.slug !== plugin.slug), installed];
      await window.api.servers.update(server.id, { plugins: updatedPlugins });
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setInstallingSlug(null);
    }
  };

  const checkUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const results = await window.api.hangar.checkUpdates({
        plugins: server.plugins || [],
        mcVersion: server.mcVersion
      });
      const map = {};
      results.forEach((r) => (map[r.slug] = r));
      setUpdateInfo(map);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const installed = server.plugins || [];
  const unmanaged = server.unmanagedPlugins || [];

  return (
    <div className="h-full overflow-y-auto px-8 py-6 space-y-8">
      {!server.mcVersion && (
        <div className="bg-copper-500/10 border border-copper-500/30 rounded-lg px-4 py-2.5 text-xs text-copper-400">
          Bu sunucunun Minecraft sürümü belirtilmemiş — arama sonuçları sürüm filtresi olmadan geliyor,
          kurmadan önce uyumluluğu kendin kontrol et. Ayarlar sekmesinden ekleyebilirsin.
        </div>
      )}

      <section>
        <h3 className="text-sm font-medium text-stone-200 mb-3">Hangar'da ara</h3>
        <form onSubmit={search} className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Plugin adı, örn. EssentialsX"
            className="flex-1 bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500"
          />
          <button
            disabled={searching}
            className="px-4 py-2 rounded-lg bg-copper-500 hover:bg-copper-400 disabled:opacity-50 text-base-900 text-sm font-medium"
          >
            {searching ? "Aranıyor…" : "Ara"}
          </button>
        </form>

        {error && <p className="text-sm text-rust-400 mb-3">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          {results.map((p) => (
            <div key={p.slug} className="bg-base-700 border border-base-600 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-stone-200 truncate">{p.name}</h4>
                  <p className="text-xs text-stone-400 line-clamp-2 mt-0.5">{p.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-stone-400">{p.downloads.toLocaleString("tr-TR")} indirme</span>
                <button
                  onClick={() => install(p)}
                  disabled={installingSlug === p.slug}
                  className="px-3 py-1.5 rounded-lg bg-base-600 hover:bg-base-500 disabled:opacity-50 text-xs font-medium"
                >
                  {installingSlug === p.slug ? "Kuruluyor…" : "Yükle"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-stone-200">Kurulu pluginler</h3>
          <button
            onClick={checkUpdates}
            disabled={checkingUpdates || installed.length === 0}
            className="text-xs text-copper-400 hover:text-copper-300 disabled:opacity-40"
          >
            {checkingUpdates ? "Kontrol ediliyor…" : "Güncellemeleri kontrol et"}
          </button>
        </div>

        {installed.length === 0 ? (
          <p className="text-sm text-stone-400">Pyckaxe üzerinden henüz plugin kurulmadı.</p>
        ) : (
          <ul className="space-y-2">
            {installed.map((p) => {
              const info = updateInfo[p.slug];
              return (
                <li
                  key={p.slug}
                  className="flex items-center justify-between bg-base-700 border border-base-600 rounded-lg px-4 py-2.5"
                >
                  <div>
                    <div className="text-sm text-stone-200">{p.slug}</div>
                    <div className="text-xs text-stone-400">Sürüm {p.installedVersion}</div>
                  </div>
                  {info?.updateAvailable && (
                    <span className="text-xs text-moss-400">Güncelleme var: {info.latestVersion}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {unmanaged.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-stone-200 mb-1">Klasörde bulunan diğer pluginler</h3>
          <p className="text-xs text-stone-400 mb-3">
            İçe aktarma sırasında plugins/ klasöründe bulundu. Hangar kaydı olmadığı için güncelleme takibi
            yapılamıyor, sadece bilgi amaçlı listeleniyor.
          </p>
          <ul className="space-y-2">
            {unmanaged.map((p) => (
              <li
                key={p.fileName}
                className="bg-base-700/60 border border-base-600 rounded-lg px-4 py-2.5 text-sm text-stone-300"
              >
                {p.fileName}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
