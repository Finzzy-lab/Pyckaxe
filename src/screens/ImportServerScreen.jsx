import React, { useEffect, useState } from "react";

export default function ImportServerScreen({ onCancel, onCreated }) {
  const [folderPath, setFolderPath] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState(null);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [versions, setVersions] = useState([]);
  const [ramGb, setRamGb] = useState(4);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.api.paper.versions().then(setVersions).catch(() => {});
  }, []);

  const chooseFolder = async () => {
    const picked = await window.api.dialog.chooseFolder();
    if (!picked) return;
    setFolderPath(picked);
    setName(picked.split(/[\\/]/).pop());
    setError("");
    setScanning(true);
    try {
      const result = await window.api.servers.scanFolder(picked);
      setScan(result);
      if (result.ramGb) setRamGb(result.ramGb);
      if (!result.hasServerJar) {
        setError("Bu klasörde server.jar bulunamadı. Yine de devam edebilirsin ama emin ol.");
      }
    } finally {
      setScanning(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setError("");
    try {
      const unmanagedPlugins = (scan?.pluginJars || []).map((fileName) => ({ fileName }));
      const server = await window.api.servers.add({
        name,
        path: folderPath,
        mcVersion: version || null,
        paperBuild: null,
        ramGb,
        plugins: [],
        unmanagedPlugins
      });
      onCreated(server);
    } catch (e) {
      setError(e.message || "İçe aktarma sırasında bir hata oluştu.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-8">
      <h2 className="font-display text-xl font-semibold text-stone-200 mb-1">Var olan sunucuyu içe aktar</h2>
      <p className="text-sm text-stone-400 mb-8">
        Dosyaları hazır bir Paper sunucu klasörünü seç, Pyckaxe listeye ekleyip yönetmeye başlasın.
      </p>

      <div className="space-y-5">
        <div>
          <label className="text-sm text-stone-300 block mb-1.5">Sunucu klasörü</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={folderPath}
              placeholder="Bir klasör seç…"
              className="flex-1 bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm text-stone-400"
            />
            <button
              onClick={chooseFolder}
              className="px-4 py-2 rounded-lg bg-base-600 hover:bg-base-500 text-sm font-medium"
            >
              Seç
            </button>
          </div>
        </div>

        {scanning && <p className="text-sm text-stone-400">Klasör taranıyor…</p>}

        {scan && !scanning && (
          <div className="bg-base-700 border border-base-600 rounded-lg p-4 text-sm space-y-1.5">
            <div className="flex items-center gap-2">
              <span>{scan.hasServerJar ? "✅" : "⚠️"}</span>
              <span className="text-stone-300">
                {scan.hasServerJar ? "server.jar bulundu" : "server.jar bulunamadı"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>{scan.ramGb ? "✅" : "ℹ️"}</span>
              <span className="text-stone-300">
                {scan.ramGb ? `Başlatma script'inden RAM algılandı: ${scan.ramGb}GB` : "RAM otomatik algılanamadı, aşağıdan seç"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>{scan.pluginJars.length > 0 ? "✅" : "ℹ️"}</span>
              <span className="text-stone-300">
                {scan.pluginJars.length > 0
                  ? `${scan.pluginJars.length} plugin dosyası bulundu`
                  : "plugins/ klasöründe dosya bulunamadı"}
              </span>
            </div>
          </div>
        )}

        {folderPath && (
          <>
            <div>
              <label className="text-sm text-stone-300 block mb-1.5">Sunucu adı</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500"
              />
            </div>

            <div>
              <label className="text-sm text-stone-300 block mb-1.5">
                Minecraft sürümü <span className="text-stone-400 font-normal">(biliyorsan, önerilir)</span>
              </label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500"
              >
                <option value="">Bilmiyorum / belirtmeyeceğim</option>
                {versions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <p className="text-xs text-stone-400 mt-1.5">
                Boş bırakırsan Hangar'da plugin ararken sürüm uyumluluk filtresi çalışmaz.
              </p>
            </div>

            <div>
              <label className="text-sm text-stone-300 block mb-1.5">
                RAM ayırımı: <span className="text-copper-400 font-medium">{ramGb} GB</span>
              </label>
              <input
                type="range"
                min="1"
                max="16"
                value={ramGb}
                onChange={(e) => setRamGb(Number(e.target.value))}
                className="w-full accent-copper-500"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-rust-400">{error}</p>}
      </div>

      <div className="flex justify-between mt-10">
        <button onClick={onCancel} className="text-sm text-stone-400 hover:text-stone-200">
          Vazgeç
        </button>
        <button
          disabled={!folderPath || !name || importing}
          onClick={runImport}
          className="px-4 py-2 rounded-lg bg-copper-500 hover:bg-copper-400 disabled:opacity-40 text-base-900 text-sm font-medium"
        >
          {importing ? "Ekleniyor…" : "İçe aktar"}
        </button>
      </div>
    </div>
  );
}
