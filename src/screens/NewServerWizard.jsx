import React, { useEffect, useState } from "react";

const STEPS = ["Klasör", "Sürüm", "Ayarlar", "Kurulum"];

export default function NewServerWizard({ onCancel, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState("");

  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [versionsError, setVersionsError] = useState("");
  const [version, setVersion] = useState("");

  const [builds, setBuilds] = useState([]);
  const [buildsLoading, setBuildsLoading] = useState(false);
  const [build, setBuild] = useState(null);

  const [ramGb, setRamGb] = useState(4);
  const [installing, setInstalling] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState("");

  const loadVersions = () => {
    setVersionsLoading(true);
    setVersionsError("");
    window.api.paper
      .versions()
      .then((list) => {
        setVersions(list);
        if (list[0]) setVersion(list[0]);
      })
      .catch((e) => setVersionsError(e.message || "Sürüm listesi alınamadı."))
      .finally(() => setVersionsLoading(false));
  };

  useEffect(loadVersions, []);

  useEffect(() => {
    if (!version) return;
    setBuild(null);
    setBuildsLoading(true);
    window.api.paper
      .builds(version)
      .then((list) => {
        setBuilds(list);
        if (list[0]) setBuild(list[0].build);
      })
      .catch((e) => setVersionsError(e.message || "Build listesi alınamadı."))
      .finally(() => setBuildsLoading(false));
  }, [version]);

  const chooseFolder = async () => {
    const picked = await window.api.dialog.chooseFolder();
    if (picked) {
      setFolderPath(picked);
      if (!name) setName(picked.split(/[\\/]/).pop());
    }
  };

  const runInstall = async () => {
    setInstalling(true);
    setError("");
    try {
      const selectedBuild = builds.find((b) => b.build === build);
      if (!selectedBuild) throw new Error("Seçili Paper sürümü bulunamadı, bir önceki adıma dönüp tekrar seç.");

      setProgressMsg("Sunucu dosyası indiriliyor…");
      await window.api.paper.setupServer({
        folderPath,
        jarName: selectedBuild.jarName,
        sha256: selectedBuild.sha256,
        url: selectedBuild.url,
        ramGb
      });

      setProgressMsg("Kayıt oluşturuluyor…");
      const server = await window.api.servers.add({
        name,
        path: folderPath,
        mcVersion: version,
        paperBuild: build,
        ramGb
      });

      onCreated(server);
    } catch (e) {
      setError(e.message || "Kurulum sırasında bir hata oluştu.");
      setInstalling(false);
    }
  };

  const canNext = [!!folderPath && !!name, !!version && !!build, true][step];

  return (
    <div className="max-w-xl mx-auto py-10 px-8">
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`text-xs font-medium ${i === step ? "text-copper-400" : "text-stone-400"}`}>
              {s}
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-base-600" />}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="text-sm text-stone-300 block mb-1.5">Sunucu adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Survival Sunucusu"
              className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500"
            />
          </div>
          <div>
            <label className="text-sm text-stone-300 block mb-1.5">Kurulum klasörü</label>
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
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-stone-300">Minecraft sürümü</label>
              {versionsLoading && <span className="text-xs text-stone-400">Yükleniyor…</span>}
            </div>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              disabled={versionsLoading || versions.length === 0}
              className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500 disabled:opacity-50"
            >
              <option value="">Seç…</option>
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {versionsError && (
              <div className="mt-2 flex items-center gap-3">
                <p className="text-xs text-rust-400">{versionsError}</p>
                <button onClick={loadVersions} className="text-xs text-copper-400 hover:text-copper-300 shrink-0">
                  Tekrar dene
                </button>
              </div>
            )}
          </div>

          {version && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-stone-300">Paper sürümü</label>
                {buildsLoading && <span className="text-xs text-stone-400">Yükleniyor…</span>}
              </div>
              <select
                value={build ?? ""}
                onChange={(e) => setBuild(Number(e.target.value))}
                disabled={buildsLoading || builds.length === 0}
                className="w-full bg-base-700 border border-base-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-copper-500 disabled:opacity-50"
              >
                {builds.map((b, i) => (
                  <option key={b.build} value={b.build}>
                    {version}.{b.build}
                    {i === 0 ? " (en güncel)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-stone-400 mt-1.5">
                Sondaki numara Paper'ın build numarası — Paper'da sunucu içi{" "}
                <code className="text-stone-300">/version</code> komutuyla gördüğün formatın aynısı.
              </p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
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
          <div className="bg-base-700 border border-base-600 rounded-lg p-4 text-sm text-stone-300 space-y-1">
            <div>
              <span className="text-stone-400">Sunucu:</span> {name}
            </div>
            <div>
              <span className="text-stone-400">Sürüm:</span> {version}.{build}
            </div>
            <div>
              <span className="text-stone-400">Klasör:</span> {folderPath}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {!installing && !error && (
            <p className="text-sm text-stone-300">
              Her şey hazır. Kur'a tıkladığında server.jar indirilecek, eula ve başlatma script'leri
              otomatik oluşturulacak.
            </p>
          )}
          {installing && <p className="text-sm text-copper-400">{progressMsg}</p>}
          {error && <p className="text-sm text-rust-400">{error}</p>}
        </div>
      )}

      <div className="flex justify-between mt-10">
        <button onClick={onCancel} className="text-sm text-stone-400 hover:text-stone-200">
          Vazgeç
        </button>
        <div className="flex gap-2">
          {step > 0 && !installing && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg bg-base-600 hover:bg-base-500 text-sm font-medium"
            >
              Geri
            </button>
          )}
          {step < 3 && (
            <button
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 rounded-lg bg-copper-500 hover:bg-copper-400 disabled:opacity-40 disabled:hover:bg-copper-500 text-base-900 text-sm font-medium"
            >
              İleri
            </button>
          )}
          {step === 3 && (
            <button
              disabled={installing}
              onClick={runInstall}
              className="px-4 py-2 rounded-lg bg-copper-500 hover:bg-copper-400 disabled:opacity-60 text-base-900 text-sm font-medium"
            >
              {installing ? "Kuruluyor…" : "Kur"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
